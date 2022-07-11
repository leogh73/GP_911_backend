import bcrypt from 'bcryptjs';
import User from '../models/user.js';

const register = async (req, res, next) => {
	const { username, email } = req.body;

	let usernameCheck;
	let emailCheck;
	try {
		usernameCheck = await validation(username);
		emailCheck = await validation(email);
	} catch (error) {
		return { error: error };
	}

	if (usernameCheck.result || emailCheck.result) {
		return res.send({
			username: usernameCheck.result,
			email: emailCheck.result,
		});
	}

	next();
};

const login = async (req, res, next) => {
	const { usernameOrEmail, password } = req.body;

	let validateUsernameOrEmail;
	try {
		validateUsernameOrEmail = await validation(usernameOrEmail);
	} catch (error) {
		return res.send({ error: 'error' });
	}

	if (!validateUsernameOrEmail.result) {
		return res.send({
			usernameOrEmail: validateUsernameOrEmail.result,
			message: validateUsernameOrEmail.errorMessage,
		});
	}

	let validationPassword;
	try {
		validationPassword = await bcrypt.compare(password, validateUsernameOrEmail.storedPassword);
	} catch (error) {
		return res.send({ error: 'error' });
	}

	if (!validationPassword) return res.send({ password: validationPassword });

	req.body.userId = validateUsernameOrEmail.userId;
	req.body.fullName = validateUsernameOrEmail.fullName;
	req.body.section = validateUsernameOrEmail.section;
	req.body.guardId = validateUsernameOrEmail.guardId;
	req.body.superior = validateUsernameOrEmail.superior;

	next();
};

const validation = async (value) => {
	let result = false;
	let userId = '';
	let fullName;
	let storedPassword;
	let errorMessage;
	let section;
	let guardId;
	let superior;

	let phoneResult;
	let monitoringResult;
	if (!value.includes('@')) {
		monitoringResult = await User.Monitoring.findOne({ username: value });
		phoneResult = await User.Phone.findOne({ username: value });
	}
	if (value.includes('@')) {
		monitoringResult = await User.Monitoring.findOne({
			email: value,
		});
		phoneResult = await User.Phone.findOne({
			email: value,
		});
	}

	if (monitoringResult)
		if (monitoringResult.username === value || monitoringResult.email === value) {
			userId = monitoringResult.id;
			fullName = `${monitoringResult.lastName} ${monitoringResult.firstName}`;
			storedPassword = monitoringResult.password;
			result = true;
			section = 'Monitoreo';
			guardId = monitoringResult.guardId;
			superior = monitoringResult.superior;
		}
	if (phoneResult)
		if (phoneResult.username === value || phoneResult.email === value) {
			userId = phoneResult.id;
			fullName = `${phoneResult.lastName} ${phoneResult.firstName}`;
			storedPassword = phoneResult.password;
			result = true;
			section = 'Teléfono';
			guardId = phoneResult.guardId;
			superior = phoneResult.superior;
		}
	if (!result && !value.includes('@')) errorMessage = 'El nombre de usuario no está registrado.';
	if (!result && value.includes('@')) errorMessage = 'El correo electrónico no está registrado.';

	return {
		result,
		errorMessage,
		userId,
		fullName,
		section,
		guardId,
		superior,
		storedPassword,
	};
};

// async function validaruser(nameuser) {
// 	let resultado = false;
// 	let userId = '';
// 	let storedPassword;
// 	let errorMessage;

// 	let monitoringResult = await db.user.User.Monitoring.findOne({ username: nameuser });
// 	let phoneResult = await db.user.User.Phone.findOne({ username: nameuser });
// 	if (monitoringResult && monitoringResult.username ===nameuser) {
// 		userId = monitoringResult.id;
// 		storedPassword = monitoringResult.password;
// 		resultado = true;
// 	}
// 	if (phoneResult && phoneResult.username ===nameuser) {
// 		userId = phoneResult.id;
// 		storedPassword = phoneResult.password;
// 		resultado = true;
// 	}
// 	if (!resultado) errorMessage = 'El name de user no está registrado.';
// 	return { userId, resultado, errorMessage, storedPassword };
// }

// async function validarEmail(email) {
// 	let resultado = false;
// 	let userId = '';
// 	let errorMessage;
// 	let monitoringResult = await db.user.User.Monitoring.findOne({
// 		email: email,
// 	});
// 	let phoneResult = await db.user.User.Phone.findOne({
// 		email: email,
// 	});
// 	if (monitoringResult && monitoringResult.email === email) {
// 		userId = monitoringResult.id;
// 		storedPassword = monitoringResult.password;
// 		resultado = true;
// 	}
// 	if (phoneResult && phoneResult.email === email) {
// 		userId = phoneResult.id;
// 		storedPassword = phoneResult.password;
// 		resultado = true;
// 	}
// 	if (!resultado) errorMessage = 'El correo electrónico no está registrado.';
// 	return { resultado, userId, errorMessage, storedPassword };
// }

export default { register, login };
