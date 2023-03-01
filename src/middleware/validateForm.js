import bcrypt from 'bcryptjs';
import db from '../modules/mongodb.js';

const search = async (value) =>
	value.includes('@')
		? await db.User.findOne({ email: value })
		: await db.User.findOne({ username: value });

const register = async (req, res, next) => {
	const { username, email } = req.body;

	let verification;
	try {
		verification = await Promise.all([search(username), search(email)]);
	} catch (error) {
		await db.storeLog('DB search', { userId: req.userData.userId, body: req.body }, error);
		return res.send({ error: error.toString() });
	}

	if (verification[0] || verification[1]) {
		return res.send({
			username: verification[0] ? 'error' : null,
			email: verification[1] ? 'error' : null,
		});
	}

	next();
};

const login = async (req, res, next) => {
	const { usernameOrEmail, password } = req.body;

	let storedData;
	try {
		storedData = await search(usernameOrEmail);
	} catch (error) {
		await db.storeLog('DB search', { userId: req.userData.userId, body: req.body }, error);
		console.log(error);
		return res.send({ error: 'error' });
	}

	if (!storedData) return res.send({ usernameOrEmail: 'error' });

	let validationPassword;
	try {
		validationPassword = await bcrypt.compare(password, storedData.password);
	} catch (error) {
		await db.storeLog('Bcrypt check', { userId: req.userData.userId, body: req.body }, error);
		return res.send({ error: 'error' });
	}

	if (!validationPassword) return res.send({ password: 'error' });

	const { _id, firstName, lastName, ni, hierarchy, section, guardId, email, superior, admin } =
		storedData.toObject();

	req.body.userData = {
		userId: _id,
		firstName,
		lastName,
		ni,
		hierarchy,
		section,
		guardId,
		email,
		superior,
		admin,
	};

	next();
};

const changePassword = async (req, res, next) => {
	const { currentPassword } = req.body;

	let storedData;
	try {
		storedData = await db.User.findById(req.userData.userId);
	} catch (error) {
		await db.storeLog('DB search', { userId: req.userData.userId, body: req.body }, error);
		return res.send({ error: 'User not found' });
	}

	if (!storedData) return res.send({ error: 'User not found' });

	let validationPassword;
	try {
		validationPassword = await bcrypt.compare(currentPassword, storedData.password);
	} catch (error) {
		await db.storeLog('Wrong password', { userId: req.userData.userId, body: req.body }, error);
		return res.send({ error: 'Wrong password' });
	}

	if (!validationPassword) return res.send({ error: 'Password not valid' });

	next();
};

const forgotPassword = async (req, res, next) => {
	const { usernameOrEmail, password } = req.body;

	let storedData;
	try {
		storedData = await search(usernameOrEmail);
	} catch (error) {
		return res.send({ error: 'error' });
	}

	if (!storedData) return res.send({ usernameOrEmail: 'error' });

	let validationPassword;
	try {
		validationPassword = await bcrypt.compare(password, storedData.password);
	} catch (error) {
		return res.send({ error: 'error' });
	}

	if (!validationPassword) return res.send({ password: 'error' });

	const { _id, firstName, lastName, section, guardId, superior } = storedData.toObject();

	req.body.userData = { userId: _id, firstName, lastName, section, guardId, superior };

	next();
};

export default { register, login, changePassword, forgotPassword };
