import { Router } from 'express';
const router = Router();
import { verifyAuthorization } from '../middleware/verifyAuthorization.js';
import guards from '../controllers/guards_controllers.js';

router.post('/test', guards.monthTotal);

router.use(verifyAuthorization);

router.post('/day', guards.day);
router.get('/today', guards.today);
router.post('/usermonth', guards.monthOwn);
router.post('/monthTotal', guards.monthTotal);

export default router;
