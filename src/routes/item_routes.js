import { Router } from 'express';
const router = Router();
import item from '../controllers/item_controllers.js';
import { verifyAuthorization } from '../middleware/verifyAuthorization.js';
import { verifyCookie } from '../middleware/verifyCookie.js';

router.use(verifyCookie);
router.use(verifyAuthorization);

router.post('/all', item.all);
router.post('/new', item.newOne);
router.post('/edit', item.edit);
router.post('/modify', item.modify);

export default router;
