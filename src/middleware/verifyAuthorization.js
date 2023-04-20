import jwt from 'jsonwebtoken';
import db from '../modules/mongodb.js';

export const verifyAuthorization = async (req, res, next) => {
	try {
		const token = req.headers.authorization.split(' ')[1];
		const accessToken = jwt.verify(token, process.env.SERVICE_ENCRYPTION_KEY);
		const { _id, fullName, section, guardId, superior, admin } = accessToken;
		req.userData = { userId: _id, fullName, section, guardId, superior, admin };
		next();
	} catch (error) {
		if (!req.cookies.token) return res.status(200).send({ message: 'Session not found' });

		let refreshToken;
		try {
			refreshToken = jwt.verify(req.cookies.token, process.env.SERVICE_ENCRYPTION_KEY);
		} catch (error) {
			res.clearCookie('token', {
				httpOnly: true,
				secure: true,
				sameSite: 'none',
			});
			return res.send({ error: 'Not authorized' });
		}

		const { userId } = refreshToken;

		if (!userId) return res.status(401).send({ error: 'Not authorized' });

		let userData;
		try {
			userData = await db.User.findById(userId);
		} catch (error) {
			await db.storeLog('User not found', { userId, body: req.body }, error);
			return res.send({ error: 'User not found' });
		}

		let fullName = `${userData.lastName} ${userData.firstName}`;
		req.userData = userData;
		req.userData.fullName = fullName;
		const { _id, section, guardId, superior, admin } = userData;
		let newAccessToken;
		try {
			newAccessToken = jwt.sign(
				{ _id, fullName, section, guardId, superior, admin },
				process.env.SERVICE_ENCRYPTION_KEY,
				{ expiresIn: '1m' },
			);
		} catch (error) {
			await db.storeLog('New access token', { body: req.body, headers: req.headers }, error);
			console.log(error);
			return res.send({ error: 'error' });
		}

		req.newAccessToken = newAccessToken;

		next();
	}
};
