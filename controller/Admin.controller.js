import UserModel from '../model/User.model.js';
import TimeEntryModel from '../model/Timeentry.model.js';

const getStartOfWeek = () => {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - diffToMonday);
  return monday;
};

// @route  GET /api/admin/users
// One row per team member: name, email, whether they're currently clocked in
// (and since when), plus their total hours this week. Scoped to only the
// people THIS admin invited (plus the admin themselves), not every user
// on the whole platform.
export const getAllUsersOverview = async (req, res) => {
  try {
    const users = await UserModel.find({
      $or: [{ teamOwner: req.userId }, { _id: req.userId }],
    })
      .select('-password')
      .sort({ createdAt: -1 });

    const weekStart = getStartOfWeek();

    const overview = await Promise.all(
      users.map(async (user) => {
        const activeEntry = await TimeEntryModel.findOne({ user: user._id, endTime: null });

        const weekEntries = await TimeEntryModel.find({
          user: user._id,
          endTime: { $ne: null },
          startTime: { $gte: weekStart },
        });
        const weekSeconds = weekEntries.reduce((sum, e) => sum + (e.durationSeconds || 0), 0);

        return {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          companyName: user.companyName,
          jobTitle: user.jobTitle,
          isClockedIn: !!activeEntry,
          clockedInAt: activeEntry ? activeEntry.startTime : null,
          weekHours: (weekSeconds / 3600).toFixed(1),
        };
      })
    );

    res.status(200).json({ users: overview });
  } catch (error) {
    console.error('Admin get users error:', error.message);
    res.status(500).json({ message: 'Something went wrong.' });
  }
};

// @route  DELETE /api/admin/users/:userId
// Fully removes a team member: deletes their account and every one
// of their time entries. Scoped so an admin can only remove someone
// who is actually their own invited team member — not any user on
// the platform, and not themselves (they're not their own teamOwner).
export const removeTeamMember = async (req, res) => {
  try {
    const target = await UserModel.findOne({ _id: req.params.userId, teamOwner: req.userId });
    if (!target) {
      return res.status(404).json({ message: 'That person is not a member of your team' });
    }

    await TimeEntryModel.deleteMany({ user: target._id });
    await target.deleteOne();

    res.status(200).json({ message: `${target.fullName} has been removed from your team` });
  } catch (error) {
    console.error('Remove team member error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};
// Flat list of time entries belonging to this admin's own team
// (plus the admin's own entries), most recent first, with the
// username attached to each row.
export const getAllEntries = async (req, res) => {
  try {
    const teamUserIds = await UserModel.find({
      $or: [{ teamOwner: req.userId }, { _id: req.userId }],
    }).distinct('_id');

    const entries = await TimeEntryModel.find({ user: { $in: teamUserIds } })
      .populate('user', 'fullName email')
      .populate('project', 'name color')
      .sort({ startTime: -1 })
      .limit(200);

    res.status(200).json({ entries });
  } catch (error) {
    console.error('Admin get entries error:', error.message);
    res.status(500).json({ message: 'Something went wrong.' });
  }
};