import { Router } from 'express';
const router = Router();
import { verifyAuthorization } from '../middleware/verifyAuthorization.js';
import spreadsheet from '../controllers/spreadsheet_controllers.js';

router.post('/test', spreadsheet.guardMonthTotal);

router.use(verifyAuthorization);

router.post('/day', spreadsheet.guardDay);
router.get('/today', spreadsheet.guardToday);
router.post('/usermonth', spreadsheet.guardMonthOwn);
router.post('/monthtotal', spreadsheet.guardMonthTotal);
router.get('/users', spreadsheet.allUsers);

export default router;
