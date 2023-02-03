import { Router } from 'express';
const router = Router();
import validateForm from '../middleware/validateForm.js';
import { verifyAuthorization } from '../middleware/verifyAuthorization.js';
import user from '../controllers/user_controllers.js';

router.post('/register', validateForm.register, user.register);
router.post('/login', validateForm.login, user.login);
router.post('/renewtoken', verifyAuthorization, user.renewToken);

export default router;
