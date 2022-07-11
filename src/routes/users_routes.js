import { Router } from 'express';
const router = Router();
import validateForm from '../middleware/validateForm.js';
import { verifyAuthorization } from '../middleware/verifyAuthorization.js';
import users from '../controllers/users_controllers.js';

router.post('/register', validateForm.register, users.register);
router.post('/login', validateForm.login, users.login);
router.post('/renewtoken', verifyAuthorization, users.renewToken);

export default router;
