import { expressjwt } from 'express-jwt';

export const verifyCookie = async (req, res, next) => {
	try {
		expressjwt({
			secret: process.env.SERVICE_ENCRYPTION_KEY,
			algorithms: ['HS256'],
			getToken: (req) => req.cookies.token,
		});
		next();
	} catch (error) {
		await db.storeLog('Authorization Cookie', { body: req.body, headers: req.headers }, error);
		console.log(error);
		res.status(403).send({ error: 'Cookie not found' });
	}
};
