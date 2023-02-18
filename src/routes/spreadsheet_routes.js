import { Router } from 'express';
const router = Router();
import { verifyAuthorization } from '../middleware/verifyAuthorization.js';
import spreadsheet from '../controllers/spreadsheet_controllers.js';

router.use(verifyAuthorization);

router.get('/month', spreadsheet.scheduleMonth);
router.post('/search', spreadsheet.scheduleSearch);
router.get('/users', spreadsheet.allUsers);
router.post('/day', spreadsheet.guardDay);

export default router;
