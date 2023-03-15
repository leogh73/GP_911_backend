import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../modules/mongodb.js';
import luxon from '../modules/luxon.js';

const search = async (value) =>
	value.includes('@')
		? await db.User.findOne({ email: value })
		: await db.User.findOne({ username: value });

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

	let encryptedPassword;
	try {
		let salt = await bcrypt.genSalt(12);
		encryptedPassword = await bcrypt.hash(password, salt);
	} catch (error) {
		return res.send({ error: 'error' });
	}

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
		await newUser.save();
	} catch (error) {
		await db.storeLog('Store new user', { userId: req.userData.userId, body: req.body }, error);
		console.log(error);
		return res.send({ userId: null });
	}

	res.send({
		userId: newUser.id,
	});
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
	} = req.body.userData;
	let fullName = `${lastName} ${firstName}`;

	let token;
	try {
		token = jwt.sign(
			{ _id, fullName, section, guardId, superior, admin },
			'codigo_ultrasecreto_no_compartir',
			{ expiresIn: '1h' },
		);
	} catch (error) {
		await db.storeLog('Generate token', { userId: _id, body: req.body }, error);
		return res.send({ error: 'error' });
	}

	res.send({
		token,
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

const changePassword = async (req, res) => {
	const { newPassword } = req.body;
	const { userId } = req.userData;

	let encryptedPassword;
	try {
		let salt = await bcrypt.genSalt(12);
		encryptedPassword = await bcrypt.hash(newPassword, salt);
	} catch (error) {
		await db.storeLog(
			'Generate encrypted password',
			{ userId: req.userData.userId, body: req.body },
			error,
		);
		return res.send({ error: 'Bcrypt' });
	}

	console.log(newPassword);

	try {
		const result = await db.User.findOneAndUpdate(
			{ _id: userId },
			{ $set: { password: encryptedPassword } },
		);
		return res.send(result);
	} catch (error) {
		await db.storeLog(
			'Change DB password',
			{ userId: req.userData.userId, body: req.body },
			error,
		);
		return res.send({ error: 'Change password' });
	}
};

const forgotPassword = async (req, res) => {
	const { newPassword } = req.body;
	const { model } = req.userData;

	let encryptedPassword;
	try {
		let salt = await bcrypt.genSalt(12);
		encryptedPassword = await bcrypt.hash(newPassword, salt);
	} catch (error) {
		return res.send({ error: 'Bcrypt' });
	}

	try {
		const result = await model.findOneAndUpdate({ password: encryptedPassword });
		return res.send(result);
	} catch (err) {
		return res.send({ error: 'error' });
	}
};

const renewToken = async (req, res) => {
	const { usernameOrEmail, section, guardId, superior, userId } = req.userData;

	let newToken;
	try {
		newToken = sign(
			{ usernameOrEmail, section, guardId, superior, userId },
			'codigo_ultrasecreto_no_compartir',
			{ expiresIn: '1h' },
		);
	} catch (error) {
		return res.send({ error: 'error' });
	}

	res.send({ token: newToken });
};

const allUsers = async (req, res) => {
	if (!req.userData.superior && !req.userData.admin) return res.send({ error: 'User not valid' });

	const { section } = req.body;

	try {
		let allUsers = await db.User.find({ section: section });
		return res.send({ allUsers });
	} catch (error) {
		await db.storeLog('Get all users', { userId: req.userData.userId }, error);
		console.log(error);
		return res.send({ error: error.toString() });
	}
};

export default { register, login, changePassword, forgotPassword, renewToken, allUsers };
