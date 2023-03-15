import jwt from 'jsonwebtoken';
import db from '../modules/mongodb.js';

export const verifyAuthorization = async (req, res, next) => {
	try {
		const token = req.headers.authorization.split(' ')[1];
		const tokenData = jwt.verify(token, 'codigo_ultrasecreto_no_compartir');
		const { _id, fullName, section, guardId, superior, admin } = tokenData;
		req.userData = { userId: _id, fullName, section, guardId, superior, admin };
		next();
	} catch (error) {
		await db.storeLog('Authorization', { body: req.body, headers: req.headers }, error);
		console.log(error);
		let errorMesssage =
			error.toString() === 'TokenExpiredError: jwt expired' ? 'Token expired' : 'Not authorized';
		res.status(403).send({ error: errorMesssage });
	}
};
