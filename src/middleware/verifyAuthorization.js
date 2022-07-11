import jwt from 'jsonwebtoken';

export const verifyAuthorization = (req, res, next) => {
	try {
		const token = req.headers.authorization.split(' ')[1];
		if (!token) return res.send({ error: 'Error' });
		const tokenData = jwt.verify(token, 'codigo_ultrasecreto_no_compartir');
		req.userData = {
			usernameOrEmail: tokenData.usernameOrEmail,
			userId: tokenData.userId,
			section: tokenData.section,
			guardId: tokenData.guardId,
			superior: tokenData.superior,
		};
		next();
	} catch (error) {
		return res.send({ error: 'Error' });
	}
};
