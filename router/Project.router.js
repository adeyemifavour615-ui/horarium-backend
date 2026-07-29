import express from 'express';
import { protect } from '../middleware/Auth.middleware.js';
import { requireAdmin } from '../middleware/Admin.middleware.js';
import { getProjects, createProject, updateProject, deleteProject } from '../controller/Project.controller.js';

const router = express.Router();

router.use(protect);

router.get('/', getProjects);
router.post('/', requireAdmin, createProject);
router.patch('/:id', requireAdmin, updateProject);
router.delete('/:id', requireAdmin, deleteProject);

export default router;