import { Router } from 'express';
const router = Router();
import validateForm from '../middleware/validateForm.js';
import { verifyAuthorization } from '../middleware/verifyAuthorization.js';
import user from '../controllers/user_controllers.js';

import db from '../modules/mongodb.js';

router.post('/login', validateForm.login, user.login);
router.post('/forgot-password', user.forgotPassword);
router.post('/new-password', user.forgotPassword);

router.use(verifyAuthorization);

router.post('/register', validateForm.register, user.register);
router.post('/change-password', validateForm.changePassword, user.changePassword);
router.post('/profile-edit', user.profileEdit);
router.post('/modify', user.modify);
router.post('/allusers', user.allUsers);
router.post('/refresh-session', user.refreshSession);
router.post('/logout', user.logout);

// import notifyUsers from '../modules/gmail.js'

// router.get('/testmail', async (req, res) => {
// 	let changeData = {
// 		_id: {
// 			$oid: '622f5f0c876d2f5579da2682',
// 		},
// 		section: 'Monitoring',
// 		changelog: [
// 			{
// 				date: '14/12/2023',
// 				time: '13:24:48',
// 				details: ['Creación'],
// 				user: 'Cuevas Leonardo',
// 			},
// 			{
// 				date: '28/12/2023',
// 				time: '15:44:48',
// 				details: ["Estado: 'Solicitado' --> 'Aprobado'", "Estado: 'Solicitado' --> 'Aprobado'"],
// 				user: 'Machado Emilce',
// 			},
// 		],
// 		startDate: '14/12/2023',
// 		coverData: {
// 			name: 'Cuevas Leonardo',
// 			date: '17/12/2023',
// 			shift: '14 a 22 hs.',
// 			day: 'Lunes',
// 			guardId: 'A',
// 		},
// 		returnData: {
// 			name: 'Conti Mauro',
// 			date: '23/12/2023',
// 			day: 'Domingo',
// 			shift: '22 a 6 hs.',
// 			guardId: 'E',
// 		},
// 		status: 'Autorizado',
// 		__v: 0,
// 	};

// 	try {
// 		let mailId = await notifyUsers(
// 			changeData,
// 			'Aprobado',
// 			`Su cambio de guardia ha sido aprobado`,
// 			'Monitoring',
// 			'change',
// 		);
// 		res.status(200).json({ mailId });
// 	} catch (error) {
// 		console.log(error);
// 	}
// });

export default router;
