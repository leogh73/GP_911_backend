import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import UserModel from '../models/user.js';
import guardsControllers from './guards_controllers.js';

const register = async (req, res) => {
	const { username, lastName, firstName, ni, section, guard, email, password } = req.body;

	let encryptedPassword;
	try {
		let salt = await bcrypt.genSalt(12);
		encryptedPassword = await bcrypt.hash(password, salt);
	} catch (error) {
		return res.send({ error: 'error' });
	}

	let userModel;
	if (section === 'Monitoreo') userModel = UserModel.Monitoring;
	if (section === 'Teléfono') userModel = UserModel.Phone;

	const newUser = new userModel({
		username,
		lastName,
		firstName,
		ni,
		section,
		guard,
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
		username: newUser.username,
		email: newUser.email,
	});
};

const login = async (req, res) => {
	const { usernameOrEmail, section, guardId, fullName, userId, superior } = req.body;

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

	let userGuards;
	if (!superior) {
		try {
			userGuards = await guardsControllers.monthOwn(section, guardId, fullName);
		} catch (error) {
			return res.send({ error: 'error' });
		}
	}

	res.send({
		fullName,
		guardId,
		superior,
		token,
		userGuards,
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

export default { register, login, renewToken };
