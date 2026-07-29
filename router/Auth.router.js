import express from 'express';
import { registerUser, loginUser, getCurrentUser, updateProfile, changePassword, uploadProfilePicture } from '../controller/auth.controller.js';
import { protect } from '../middleware/Auth.middleware.js';
import { uploadAvatar } from '../middleware/Upload.middleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getCurrentUser);
router.patch('/me', protect, updateProfile);
router.patch('/change-password', protect, changePassword);
router.post('/upload-profile-picture', protect, uploadAvatar.single('profilePicture'), uploadProfilePicture);

export default router;