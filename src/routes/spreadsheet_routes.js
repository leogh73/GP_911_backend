import { Router } from 'express';
const router = Router();
import { verifyAuthorization } from '../middleware/verifyAuthorization.js';
import spreadsheet from '../controllers/spreadsheet_controllers.js';

router.use(verifyAuthorization);

router.post('/day', spreadsheet.guardDay);
// router.get('/today', spreadsheet.guardToday);
router.get('/month', spreadsheet.scheduleMonth);
router.post('/monthtotal', spreadsheet.guardMonthTotal);
router.get('/users', spreadsheet.allUsers);

export default router;
