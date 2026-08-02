import express from 'express';
import { protect } from '../middleware/Auth.middleware.js';
import { requireAdmin } from '../middleware/Admin.middleware.js';
import { getTeamSchedules, getMySchedule, setEmployeeSchedule } from '../controller/Schedule.controller.js';

const router = express.Router();

router.use(protect);

router.get('/', requireAdmin, getTeamSchedules);
router.get('/me', getMySchedule);
router.put('/:employeeId', requireAdmin, setEmployeeSchedule);

export default router;