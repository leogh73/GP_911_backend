import { Router } from 'express';
const router = Router();
import { verifyAuthorization } from '../middleware/verifyAuthorization.js';
import changes from '../controllers/changes_controllers.js';

router.use(verifyAuthorization);

router.post('/all', changes.all);
router.post('/new', changes.newOne);
router.post('/cancel', changes.cancel);
router.post('/modify', changes.modify);

export default router;
