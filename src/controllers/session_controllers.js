import jwt from 'jsonwebtoken';
import db from '../modules/mongodb.js';

const refreshToken = async (req, res) => {
	if (!req.cookies.token) return res.status(401).json({ error: 'Not authorized' });

	console.log('refresh token!');

	let userId;
	try {
		const { _id } = jwt.verify(req.cookies.token, process.env.SERVICE_ENCRYPTION_KEY);
		userId = _id;
	} catch (error) {
		await db.storeLog('Verify refresh token', { body: req.body, headers: req.headers }, error);
		console.log(error);
		return res.send({ error: 'error' });
	}

	if (!userId) return res.status(401).send({ error: 'Token not valid' });

	let user;
	try {
		user = await db.User.findById(userId);
	} catch (error) {
		await db.storeLog('User token not found', { body: req.body, headers: req.headers }, error);
		console.log(error);
		return res.send({ error: 'error' });
	}

	if (!user) return res.status(401).send({ error: 'User not found' });

	const { _id, firstName, lastName, section, guardId, superior, admin } = user;

	let accessToken;
	try {
		accessToken = jwt.sign(
			{ _id, fullName: `${lastName} ${firstName}`, section, guardId, superior, admin },
			process.env.SERVICE_ENCRYPTION_KEY,
			{ expiresIn: '1m' },
		);
	} catch (error) {
		await db.storeLog('Refresh access token', { body: req.body, headers: req.headers }, error);
		console.log(error);
		return res.send({ error: 'error' });
	}

	if (!accessToken) return res.send({ error: 'Access Token creation' });

	res.send({ accessToken });
};

const refreshSession = async (req, res) => {
	if (!req.cookies.token) return res.status(200).send({ message: 'Session not found' });

	const tokenData = jwt.verify(req.cookies.token, process.env.SERVICE_ENCRYPTION_KEY);

	if (!tokenData) return res.status(401).send({ error: 'Not authorized' });

	const { _id } = tokenData;

	if (!_id) return res.status(401).send({ error: 'Not authorized' });

	let userData;
	try {
		userData = await db.User.findById(_id);
	} catch (error) {
		await db.storeLog('User not found', { userId: _id, body: req.body }, error);
		return res.send({ error: 'User not found' });
	}

	const {
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
	} = userData;
	let fullName = `${lastName} ${firstName}`;

	let newAccessToken;
	try {
		newAccessToken = jwt.sign(
			{ _id, fullName, section, guardId, superior, admin },
			process.env.SERVICE_ENCRYPTION_KEY,
			{ expiresIn: '5m' },
		);
	} catch (error) {
		await db.storeLog('New access token', { body: req.body, headers: req.headers }, error);
		console.log(error);
		return res.send({ error: 'error' });
	}

	res.send({
		token: newAccessToken,
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
	const cookies = req.cookies;
	if (!cookies?.token) return res.sendStatus(204);
	res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'strict' });
	res.json({ message: 'Cookie cleared correctly' });
};

export default { refreshToken, refreshSession, logout };
