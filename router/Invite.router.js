import express from 'express';
import { getInviteByToken, acceptInvite } from '../controller/Invite.controller.js';

const router = express.Router();

// Public — no auth. The person clicking the invite link doesn't have an
// account yet, so these can't sit behind `protect`.
router.get('/:token', getInviteByToken);
router.post('/accept', acceptInvite);

export default router;