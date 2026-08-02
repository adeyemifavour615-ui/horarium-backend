import ScheduleModel from '../model/Schedule.model.js';
import UserModel from '../model/User.model.js';
import { createNotification } from './Notification.controller.js';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const isValidTime = (value) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);

// @route  GET /api/schedules
// Admin-only. Returns every schedule for the admin's own team, plus a
// placeholder for team members who don't have one set up yet so the
// frontend can render a full roster in one pass.
export const getTeamSchedules = async (req, res) => {
  try {
    const teamMembers = await UserModel.find({ teamOwner: req.userId }).select('fullName email');
    const schedules = await ScheduleModel.find({ teamOwner: req.userId });

    const scheduleByEmployee = new Map(schedules.map((s) => [s.employee.toString(), s]));

    const roster = teamMembers.map((member) => ({
      employee: { _id: member._id, fullName: member.fullName, email: member.email },
      schedule: scheduleByEmployee.get(member._id.toString()) || null,
    }));

    res.status(200).json({ roster });
  } catch (error) {
    console.error('Get team schedules error:', error.message);
    res.status(500).json({ message: 'Something went wrong.' });
  }
};

// @route  GET /api/schedules/me
// Any authenticated employee — lets them see their own expected hours.
export const getMySchedule = async (req, res) => {
  try {
    const schedule = await ScheduleModel.findOne({ employee: req.userId });
    res.status(200).json({ schedule: schedule || null });
  } catch (error) {
    console.error('Get my schedule error:', error.message);
    res.status(500).json({ message: 'Something went wrong.' });
  }
};

// @route  PUT /api/schedules/:employeeId
// Admin-only, and only for employees on their own team. Upserts —
// creates the schedule on first save, overwrites on later edits.
export const setEmployeeSchedule = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const employee = await UserModel.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    if (!employee.teamOwner || employee.teamOwner.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'You can only set schedules for your own team' });
    }

    const update = {};
    for (const day of DAYS) {
      const dayInput = req.body[day];
      if (!dayInput) continue;

      const isWorkDay = Boolean(dayInput.isWorkDay);
      let { startTime = '09:00', endTime = '17:00' } = dayInput;

      if (isWorkDay) {
        if (!isValidTime(startTime) || !isValidTime(endTime)) {
          return res.status(400).json({ message: `Invalid time format for ${day}. Use HH:mm.` });
        }
        if (startTime >= endTime) {
          return res.status(400).json({ message: `${day}: start time must be before end time.` });
        }
      }

      update[day] = { isWorkDay, startTime, endTime };
    }

    const schedule = await ScheduleModel.findOneAndUpdate(
      { employee: employeeId },
      { $set: update, employee: employeeId, teamOwner: req.userId },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    createNotification(employeeId, 'Your work schedule was updated', 'schedule_updated');

    res.status(200).json({ message: 'Schedule saved', schedule });
  } catch (error) {
    console.error('Set employee schedule error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};