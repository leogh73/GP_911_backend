import { Router } from 'express';
const router = Router();
import { verifyAuthorization } from '../middleware/verifyAuthorization.js';
import list from '../controllers/list_controllers.js';

router.use(verifyAuthorization);

router.post('/all', list.all);
router.post('/new', list.newOne);
router.post('/edit', list.edit);
router.post('/modify', list.modify);
router.post('/cancel', list.cancel);

export default router;
