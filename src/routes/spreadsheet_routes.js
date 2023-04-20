import { Router } from 'express';
const router = Router();
import { verifyAuthorization } from '../middleware/verifyAuthorization.js';
import spreadsheet from '../controllers/spreadsheet_controllers.js';

router.use(verifyAuthorization);

router.post('/month', spreadsheet.scheduleMonth);
router.post('/search', spreadsheet.scheduleSearch);
router.post('/users', spreadsheet.allUsers);
router.post('/day', spreadsheet.dayGuards);

export default router;
