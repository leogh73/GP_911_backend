import { Router } from 'express';
const router = Router();
import validateForm from '../middleware/validateForm.js';
import { verifyAuthorization } from '../middleware/verifyAuthorization.js';
import user from '../controllers/user_controllers.js';

router.post('/login', validateForm.login, user.login);
router.post('/forgot-password', user.forgotPassword);
router.post('/new-password', user.forgotPassword);

router.use(verifyAuthorization);

router.post('/register', validateForm.register, user.register);
router.post('/change-password', validateForm.changePassword, user.changePassword);
router.post('/profile-edit', user.profileEdit);
router.post('/modify', user.modify);
router.post('/allusers', user.allUsers);

export default router;
