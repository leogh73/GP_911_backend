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
		return { error: error };
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

	const { userId, firstName, lastName, section, guardId, superior } = storedData.toObject();

	req.body.userData = { userId, firstName, lastName, section, guardId, superior };

	next();
};

export default { register, login };
