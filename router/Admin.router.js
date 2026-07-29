import express from 'express';
import { protect } from '../middleware/Auth.middleware.js';
import { requireAdmin } from '../middleware/Admin.middleware.js';
import { getAllUsersOverview, getAllEntries, removeTeamMember } from '../controller/Admin.controller.js';
import { createInvite, getMyInvites } from '../controller/Invite.controller.js';

const router = express.Router();

router.use(protect, requireAdmin);

router.get('/users', getAllUsersOverview);
router.delete('/users/:userId', removeTeamMember);
router.get('/entries', getAllEntries);
router.post('/invite', createInvite);
router.get('/invites', getMyInvites);

export default router;