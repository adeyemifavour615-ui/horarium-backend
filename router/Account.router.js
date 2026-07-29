import express from 'express';
import { protect } from '../middleware/Auth.middleware.js';
import { requireAdmin } from '../middleware/Admin.middleware.js';
import { deleteSelf, transferOwnership, deleteTeam } from '../controller/Account.controller.js';

const router = express.Router();

router.use(protect);

router.delete('/delete-self', deleteSelf);
router.post('/transfer-ownership', requireAdmin, transferOwnership);
router.delete('/delete-team', requireAdmin, deleteTeam);

export default router;