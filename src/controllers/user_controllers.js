import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../modules/mongodb.js';
import luxon from '../modules/luxon.js';
import vars from '../modules/crypto-js.js';
import notifyUsers from '../modules/nodemailer.js';

const encryptNewPassword = async (password, logAction, req) => {
	let encryptedPass;
	try {
		let salt = await bcrypt.genSalt(12);
		encryptedPass = await bcrypt.hash(password, salt);
	} catch (error) {
		await db.storeLog(logAction, { userId: req.userData.userId, body: req.body }, error);
	}
	return encryptedPass;
};

const storeNewPassword = async (userId, encryptedPassword, logAction, reset, req) => {
	let result;
	let user = await db.User.findById(userId);
	let fullName = `${user.lastName} ${user.firstName}`;
	let changelogItem = luxon.changelog(
		[`${reset ? 'Restablecimiento' : 'Cambio'} de contraseña`],
		null,
		req.userData?.fullName ?? fullName,
	);
	try {
		result = await db.User.findOneAndUpdate(
			{ _id: userId },
			{
				$push: {
					changelog: changelogItem,
				},
				$set: { password: encryptedPassword },
			},
		);
	} catch (error) {
		await db.storeLog(logAction, { userId: req.userData.userId, body: req.body }, error);
		console.log(error);
	}
	return { result, changelogItem, newAccessToken: req.newAccessToken };
};

const register = async (req, res) => {
	const {
		username,
		lastName,
		firstName,
		ni,
		hierarchy,
		section,
		guardId,
		superior,
		email,
		password,
	} = req.body;

	let encryptedPassword = await encryptNewPassword(password, 'Encrypt user password', req);

	if (!encryptNewPassword) return res.send({ error: 'error' });

	const newUser = new db.User({
		username,
		lastName,
		firstName,
		ni,
		hierarchy,
		section,
		guardId,
		email,
		password: encryptedPassword,
		superior: superior === 'Si' ? true : false,
		admin: false,
		changelog: [luxon.changelog(['Creación'], null, req.userData.fullName)],
	});

	try {
		let result = await newUser.save();
		return res.send({ result, newAccessToken: req.newAccessToken });
	} catch (error) {
		await db.storeLog('Store new user', { userId: req.userData.userId, body: req.body }, error);
		console.log(error);
		return res.send({ result: { _id: null } });
	}
};

const login = async (req, res) => {
	const {
		_id,
		username,
		firstName,
		lastName,
		ni,
		hierarchy,
		section,
		guardId,
		email,
		superior,
		admin,
	} = req.userData;
	let fullName = `${lastName} ${firstName}`;

	let accesssToken;
	let refreshToken;
	try {
		accesssToken = jwt.sign(
			{
				_id,
				fullName,
				section,
				guardId,
				superior,
				admin,
			},
			process.env.SERVICE_ENCRYPTION_KEY,
			{
				expiresIn: '10m',
			},
		);
		refreshToken = jwt.sign({ userId: _id }, process.env.SERVICE_ENCRYPTION_KEY, {
			expiresIn: '1h',
		});
	} catch (error) {
		await db.storeLog('Generate token', { userId: _id, body: req.body }, error);
		return res.send({ error: 'error' });
	}

	res.cookie('token', refreshToken, {
		httpOnly: true,
		secure: true,
		sameSite: 'none',
		maxAge: 7 * 24 * 60 * 60 * 1000,
	});

	res.send({
		token: accesssToken,
		_id,
		username,
		firstName,
		lastName,
		ni,
		hierarchy,
		section,
		guardId,
		email,
		superior,
		admin,
	});
};

const changePassword = async (req, res) => {
	const { newPassword } = req.body;
	const { userId } = req.userData;

	const encryptedPassword = await encryptNewPassword(
		newPassword,
		'Generate new encrypted password',
		req,
	);

	if (!encryptedPassword) return res.send({ error: 'Bcrypt' });

	const storePassword = await storeNewPassword(
		userId,
		encryptedPassword,
		'Change password',
		false,
		req,
	);

	return res.send(storePassword.result ? storePassword : { error: 'Change Password' });
};

const forgotPassword = async (req, res) => {
	const { email, token, newPassword, userId } = req.body;

	if (email) {
		const user = await db.User.findOne({ email: email });
		if (!user) return res.send({ error: 'user email' });

		try {
			let token = jwt.sign({ userId: user._id }, process.env.SERVICE_ENCRYPTION_KEY, {
				expiresIn: '1d',
			});
			let url = `${vars.FRONTEND_URL}/new-password/token=${token}`;
			let emailId = await notifyUsers(
				email,
				url,
				'Solicitud de recuperación de contraseña',
				null,
				'forgot-password',
			);
			return res.send({ _id: emailId, newAccessToken: req.newAccessToken });
		} catch (error) {
			await db.storeLog(
				'Generate recover password token',
				{ userId: user._id, body: req.body },
				error,
			);
			console.log(error);
			return res.send({ error: 'error' });
		}
	}

	if (token) {
		let userId;
		try {
			const decodedToken = jwt.verify(token, process.env.SERVICE_ENCRYPTION_KEY);
			userId = decodedToken.userId;
		} catch (error) {
			await db.storeLog('Decode token', { userId, body: req.body }, error);
			console.log(error);
			return res.send({ error: 'error' });
		}

		return res.send(!userId ? { error: 'Token not valid' } : { _id: userId });
	}

	const encryptedPassword = await encryptNewPassword(
		newPassword,
		'Generate new encrypted password',
		req,
	);

	if (!encryptedPassword) return res.send({ error: 'Bcrypt' });

	const storePassword = await storeNewPassword(
		userId,
		encryptedPassword,
		'Recover password',
		false,
		req,
	);

	return res.send(storePassword.result ? storePassword : { error: 'Change Password' });
};

const profileEdit = async (req, res) => {
	const { changeToken } = req.body;

	let userData;
	if (!req.userData.admin) {
		if (!changeToken) {
			const {
				userId,
				username,
				lastName,
				firstName,
				ni,
				hierarchy,
				section,
				guardId,
				superior,
				email,
				comment,
			} = req.body;

			try {
				let token = jwt.sign(
					{
						userId,
						username,
						lastName,
						firstName,
						ni,
						hierarchy,
						section,
						guardId,
						superior,
						email,
						comment,
					},
					process.env.SERVICE_ENCRYPTION_KEY,
					{ expiresIn: '1h' },
				);
				let url = `http://localhost:3000/profile/edit-confirm/token=${token}`;
				let mailId = await notifyUsers(
					email.new ?? email.previous,
					url,
					'Confirme cambios en su perfil',
					req.userData.section,
					'profile-edit',
				);
				return res.send({ _id: mailId, newAccessToken: req.newAccessToken });
			} catch (error) {
				await db.storeLog('Generate token', { userId: userId, body: req.body }, error);
				console.log(error);
				return res.send({ error: error.toString() });
			}
		}

		let tokenData;
		if (changeToken) {
			try {
				tokenData = jwt.verify(changeToken, process.env.SERVICE_ENCRYPTION_KEY);
			} catch (error) {
				await db.storeLog('Decode token', { userId: req.userData.userId, body: req.body }, error);
				console.log(error);
				return res.send({ error: error.toString() });
			}

			if (!tokenData) return res.send({ error: 'error' });
			userData = tokenData;
		}
	}

	const {
		userId,
		username,
		lastName,
		firstName,
		ni,
		hierarchy,
		section,
		guardId,
		superior,
		email,
		comment,
	} = req.userData.admin ? req.body : userData;

	const translateWord = (w) => {
		let newKey;
		if (w === 'username') newKey = 'Nombre de usuario';
		if (w === 'lastName') newKey = 'Apellido';
		if (w === 'firstName') newKey = 'Nombre';
		if (w === 'ni') newKey = 'NI';
		if (w === 'hierarchy') newKey = 'Jerarquía';
		if (w === 'section') newKey = 'Sección';
		if (w === 'guardId') newKey = 'Guardia';
		if (w === 'superior') newKey = 'Superior';
		if (w === 'email') newKey = 'Correo electrónico';
		if (w === 'Telefonía') newKey = 'Phoning';
		if (w === 'Despacho') newKey = 'Dispatch';
		if (w === 'Monitoreo') newKey = 'Monitoring';
		if (w === 'Si') newKey = true;
		if (w === 'No') newKey = false;
		return newKey;
	};

	console.log(req.body);

	const generateChangelog = () => {
		let changelogDetails = [];
		for (const [key, value] of Object.entries(req.userData.admin ? req.body : userData)) {
			if (!!value?.new)
				changelogDetails.push(`${translateWord(key)}: ${value.previous} --> ${value.new}`);
		}
		return changelogDetails;
	};

	let changelogItem = luxon.changelog(
		generateChangelog(),
		comment.length ? comment : null,
		req.userData.fullName,
	);

	let userObject = {
		_id: userId,
		username: username.new ?? username.previous,
		firstName: firstName.new ?? firstName.previous,
		lastName: lastName.new ?? lastName.previous,
		ni: ni.new ?? ni.previous,
		hierarchy: hierarchy.new ?? hierarchy.previous,
		section: !!section.new ? translateWord(section.new) : translateWord(section.previous),
		guardId: guardId.new ?? guardId.previous,
		superior: !!superior.new ? translateWord(superior.new) : translateWord(superior.previous),
		email: email.new ?? email.previous,
	};

	try {
		await db.User.findOneAndUpdate(
			{ _id: userId },
			{
				$push: {
					changelog: changelogItem,
				},
				$set: {
					username: userObject.username,
					firstName: userObject.firstName,
					lastName: userObject.lastName,
					ni: userObject.ni,
					hierarchy: userObject.hierarchy,
					section: userObject.section,
					guardId: userObject.guardId,
					superior: userObject.superior,
					email: userObject.email,
				},
			},
		);
		res.send({ result: userObject, newAccessToken: req.newAccessToken });
	} catch (error) {
		await db.storeLog('Edit user', { userId: req.userData.userId, body: req.body }, error);
		console.log(error);
		res.send({ error: error.toString() });
	}
};

const modify = async (req, res) => {
	const { itemId, status } = req.body;

	if (!status) {
		try {
			let result = await db.User.findOneAndDelete({ _id: itemId });
			return res.send({ result, newAccessToken: req.newAccessToken });
		} catch (error) {
			await db.storeLog('Remove user', { userId: req.userData.userId, body: req.body }, error);
			console.log(error);
			return res.send({ error: error.toString() });
		}
	}

	if (!req.userData.admin) return res.send({ error: 'Not authorized' });

	const encryptedPassword = await encryptNewPassword('12345', 'Reset password', req);

	if (!encryptedPassword) return res.send({ error: 'Bcrypt' });

	const storePassword = await storeNewPassword(
		itemId,
		encryptedPassword,
		'Reset Password',
		true,
		req,
	);

	return res.send(storePassword.result ? storePassword : { error: 'Reset Password' });
};

const allUsers = async (req, res) => {
	const { section } = req.body;

	try {
		let usersList =
			req.userData.admin && section
				? await db.User.find({ section: section })
				: (await db.User.find({ section: req.userData.section, superior: false })).map(
						(u) => `${u.lastName} ${u.firstName}`,
				  );
		res.send({ usersList, newAccessToken: req.newAccessToken });
	} catch (error) {
		await db.storeLog('Get all users', { userId: req.userData.userId }, error);
		console.log(error);
		res.send({ error: error.toString() });
	}
};

const refreshSession = (req, res) => {
	const {
		_id,
		username,
		firstName,
		lastName,
		ni,
		hierarchy,
		section,
		guardId,
		email,
		superior,
		admin,
	} = req.userData;

	res.send({
		token: req.headers?.authorization?.split(' ')[1] ?? req.newAccessToken,
		userId: _id,
		username,
		firstName,
		lastName,
		ni,
		hierarchy,
		section,
		guardId,
		email,
		superior,
		admin,
	});
};

const logout = (req, res) => {
	if (!req.cookies?.token) return res.sendStatus(204);
	res.clearCookie('token', {
		httpOnly: true,
		secure: true,
		sameSite: 'none',
	});
	res.send({ message: 'Cookie cleared correctly' });
};

export default {
	register,
	login,
	changePassword,
	forgotPassword,
	profileEdit,
	modify,
	allUsers,
	refreshSession,
	logout,
};
