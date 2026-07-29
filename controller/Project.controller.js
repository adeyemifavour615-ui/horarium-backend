import ProjectModel from '../model/Project.model.js';
import TimeEntryModel from '../model/Timeentry.model.js';
import UserModel from '../model/User.model.js';
import { createNotification } from './Notification.controller.js';

// A regular user's projects belong to the admin who invited them
// (their teamOwner). An admin's projects belong to themselves.
// Self-registered users with no teamOwner have no team, so no projects.
const getEffectiveOwnerId = async (req) => {
  const user = await UserModel.findById(req.userId);
  if (!user) return null;
  return user.role === 'admin' ? user._id : user.teamOwner;
};

// @route  GET /api/projects
// Any authenticated team member — needed so juniors can pick a
// project when starting their timer, not just admins.
export const getProjects = async (req, res) => {
  try {
    const ownerId = await getEffectiveOwnerId(req);
    if (!ownerId) {
      return res.status(200).json({ projects: [] });
    }

    const projects = await ProjectModel.find({ teamOwner: ownerId }).sort({ createdAt: -1 });
    res.status(200).json({ projects });
  } catch (error) {
    console.error('Get projects error:', error.message);
    res.status(500).json({ message: 'Something went wrong.' });
  }
};

// @route  POST /api/projects
// Admin-only (enforced by requireAdmin in the router).
export const createProject = async (req, res) => {
  try {
    const { name, description, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Project name is required' });
    }

    const project = await ProjectModel.create({
      name: name.trim(),
      description: description || '',
      color: color || '#FF6603',
      teamOwner: req.userId,
    });

    // Let existing team members know a new project is available to pick
    // when they clock in — not the admin themselves, since they just made it.
    const teamMemberIds = await UserModel.find({ teamOwner: req.userId }).distinct('_id');
    teamMemberIds.forEach((memberId) => {
      createNotification(memberId, `New project "${project.name}" was created`, 'project_created');
    });

    res.status(201).json({ message: 'Project created', project });
  } catch (error) {
    console.error('Create project error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

// @route  PATCH /api/projects/:id
// Admin-only, and only over projects they own.
export const updateProject = async (req, res) => {
  try {
    const project = await ProjectModel.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    if (project.teamOwner.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'You can only edit your own projects' });
    }

    const { name, description, color } = req.body;
    if (name !== undefined) project.name = name.trim();
    if (description !== undefined) project.description = description;
    if (color !== undefined) project.color = color;

    await project.save();
    res.status(200).json({ message: 'Project updated', project });
  } catch (error) {
    console.error('Update project error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

// @route  DELETE /api/projects/:id
// Admin-only, and only over projects they own. Existing time entries
// keep their history — we just unlink the deleted project from them
// rather than deleting the entries themselves.
export const deleteProject = async (req, res) => {
  try {
    const project = await ProjectModel.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    if (project.teamOwner.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'You can only delete your own projects' });
    }

    await TimeEntryModel.updateMany({ project: project._id }, { $set: { project: null } });
    await project.deleteOne();

    res.status(200).json({ message: 'Project deleted' });
  } catch (error) {
    console.error('Delete project error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};