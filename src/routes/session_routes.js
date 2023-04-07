import { Router } from 'express';
const router = Router();
import { verifyAuthorization } from '../middleware/verifyAuthorization.js';
import session from '../controllers/session_controllers.js';

router.get('/refresh-session', session.refreshSession);
router.get('/refresh-token', session.refreshToken);

router.use(verifyAuthorization);

router.get('/logout', session.logout);

export default router;
