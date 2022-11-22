import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../modules/mongodb.js';

const register = async (req, res) => {
	const { username, lastName, firstName, ni, section, guardId, email, password } = req.body;

	let encryptedPassword;
	try {
		let salt = await bcrypt.genSalt(12);
		encryptedPassword = await bcrypt.hash(password, salt);
	} catch (error) {
		return res.send({ error: 'error' });
	}

	let userSection;
	if (section === 'Teléfonía') userSection = 'Phoning';
	if (section === 'Monitoreo') userSection = 'Monitoring';

	const newUser = new db.User({
		username,
		lastName,
		firstName,
		ni,
		section: userSection,
		guardId,
		email,
		password: encryptedPassword,
		superior: false,
		changes: [],
	});

	try {
		await newUser.save();
	} catch (err) {
		return res.send({ error: 'error' });
	}

	res.send({
		userId: newUser.id,
	});
};

const login = async (req, res) => {
	const { usernameOrEmail, userId, firstName, lastName, section, guardId, superior } =
		req.body.userData;

	let token;
	try {
		token = jwt.sign(
			{
				usernameOrEmail,
				section,
				guardId,
				userId,
				superior,
			},
			'codigo_ultrasecreto_no_compartir',
			{ expiresIn: '1h' },
		);
	} catch (error) {
		return res.send({ error: 'error' });
	}

	res.send({
		token,
		firstName,
		lastName,
		guardId,
		superior,
	});
};

const renewToken = async (req, res) => {
	const { usernameOrEmail, section, guardId, superior, userId } = req.userData;

	let newToken;
	try {
		newToken = sign(
			{
				usernameOrEmail,
				section,
				guardId,
				superior,
				userId,
			},
			'codigo_ultrasecreto_no_compartir',
			{ expiresIn: '1h' },
		);
	} catch (error) {
		return res.send({ error: 'error' });
	}

	res.send({ token: newToken });
};

const allUsers = async (req, res) => {
	try {
	} catch (error) {}
};

export default { register, login, renewToken, allUsers };
