import { Router } from 'express';
const router = Router();
import item from '../controllers/item_controllers.js';
import { verifyAuthorization } from '../middleware/verifyAuthorization.js';

router.use(verifyAuthorization);

router.post('/all', item.all);
router.post('/new', item.newOne);
router.post('/edit', item.edit);
router.post('/modify', item.modify);

export default router;
