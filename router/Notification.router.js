import express from 'express';
import { protect } from '../middleware/Auth.middleware.js';
import { getMyNotifications, markAsRead, markAllAsRead } from '../controller/Notification.controller.js';

const router = express.Router();

router.use(protect);

router.get('/', getMyNotifications);
router.patch('/:id/read', markAsRead);
router.patch('/read-all', markAllAsRead);

export default router;