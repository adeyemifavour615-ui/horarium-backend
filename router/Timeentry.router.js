import express from 'express';
import { protect } from '../middleware/Auth.middleware.js';
import {
  startTimer,
  stopTimer,
  getActiveTimer,
  getTimeEntries,
  addManualEntry,
} from '../controller/Timeentry.controller.js';

const router = express.Router();

router.use(protect);

router.post('/start', startTimer);
router.post('/stop', stopTimer);
router.get('/active', getActiveTimer);
router.get('/', getTimeEntries);
router.post('/manual', addManualEntry);

export default router;