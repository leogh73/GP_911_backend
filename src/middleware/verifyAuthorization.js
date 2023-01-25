import jwt from 'jsonwebtoken';

export const verifyAuthorization = async (req, res, next) => {
	try {
		const token = req.headers.authorization.split(' ')[1];
		const tokenData = jwt.verify(token, 'codigo_ultrasecreto_no_compartir');
		req.userData = {
			userId: tokenData.userId,
			fullName: tokenData.fullName,
			section: tokenData.section,
			guardId: tokenData.guardId,
			superior: tokenData.superior,
		};
		next();
	} catch (error) {
		console.log(error);
		res.status(403).send({ error: 'Not authorized' });
	}
};
