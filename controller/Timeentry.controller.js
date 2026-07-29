import TimeEntryModel from '../model/Timeentry.model.js';
import ProjectModel from '../model/Project.model.js';
import UserModel from '../model/User.model.js';

// Mirrors the ownership logic in project.controller.js — makes sure a
// user can only clock in against a project that actually belongs to
// their own team, not one they guessed the ID of.
const resolveProjectId = async (userId, projectId) => {
  if (!projectId) return null;

  const user = await UserModel.findById(userId);
  const ownerId = user.role === 'admin' ? user._id : user.teamOwner;
  if (!ownerId) return null;

  const project = await ProjectModel.findOne({ _id: projectId, teamOwner: ownerId });
  return project ? project._id : null;
};

// @route  POST /api/time/start
// Starts a new running entry for the logged-in user.
// Blocks starting a second timer if one is already running.
export const startTimer = async (req, res) => {
  try {
    const existingActive = await TimeEntryModel.findOne({ user: req.userId, endTime: null });
    if (existingActive) {
      return res.status(409).json({ message: 'A timer is already running', entry: existingActive });
    }

    const projectId = await resolveProjectId(req.userId, req.body.projectId);

    const entry = await TimeEntryModel.create({
      user: req.userId,
      startTime: new Date(),
      source: 'timer',
      project: projectId,
    });

    const populated = await entry.populate('project', 'name color');

    res.status(201).json({ message: 'Timer started', entry: populated });
  } catch (error) {
    console.error('Start timer error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

// @route  POST /api/time/stop
// Stops the currently running entry (if any) and records its duration.
export const stopTimer = async (req, res) => {
  try {
    const entry = await TimeEntryModel.findOne({ user: req.userId, endTime: null });
    if (!entry) {
      return res.status(404).json({ message: 'No active timer found' });
    }

    entry.endTime = new Date();
    entry.durationSeconds = Math.round((entry.endTime - entry.startTime) / 1000);
    await entry.save();
    await entry.populate('project', 'name color');

    res.status(200).json({ message: 'Timer stopped', entry });
  } catch (error) {
    console.error('Stop timer error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

// @route  GET /api/time/active
// Lets the frontend restore timer state after a page refresh.
export const getActiveTimer = async (req, res) => {
  try {
    const entry = await TimeEntryModel.findOne({ user: req.userId, endTime: null }).populate('project', 'name color');
    res.status(200).json({ entry: entry || null });
  } catch (error) {
    console.error('Get active timer error:', error.message);
    res.status(500).json({ message: 'Something went wrong.' });
  }
};

// @route  GET /api/time
// Returns completed entries for the dashboard's stats and activity feed.
export const getTimeEntries = async (req, res) => {
  try {
    const entries = await TimeEntryModel.find({ user: req.userId, endTime: { $ne: null } })
      .sort({ startTime: -1 })
      .limit(50)
      .populate('project', 'name color');

    res.status(200).json({ entries });
  } catch (error) {
    console.error('Get time entries error:', error.message);
    res.status(500).json({ message: 'Something went wrong.' });
  }
};

// @route  POST /api/time/manual
// Lets a user log time after the fact instead of running a live timer.
export const addManualEntry = async (req, res) => {
  try {
    const { date, hours, minutes, note, projectId } = req.body;

    if (!date || (hours === undefined && minutes === undefined)) {
      return res.status(400).json({ message: 'Date and duration are required' });
    }

    const totalSeconds = (Number(hours) || 0) * 3600 + (Number(minutes) || 0) * 60;
    if (totalSeconds <= 0) {
      return res.status(400).json({ message: 'Duration must be greater than 0' });
    }

    const startTime = new Date(date);
    const endTime = new Date(startTime.getTime() + totalSeconds * 1000);
    const resolvedProjectId = await resolveProjectId(req.userId, projectId);

    const entry = await TimeEntryModel.create({
      user: req.userId,
      startTime,
      endTime,
      durationSeconds: totalSeconds,
      note: note || '',
      source: 'manual',
      project: resolvedProjectId,
    });

    await entry.populate('project', 'name color');

    res.status(201).json({ message: 'Entry added', entry });
  } catch (error) {
    console.error('Add manual entry error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};