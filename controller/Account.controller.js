import bcryptjs from 'bcryptjs';
import UserModel from '../model/User.model.js';
import TimeEntryModel from '../model/Timeentry.model.js';
import ProjectModel from '../model/Project.model.js';
import InviteModel from '../model/Invite.model.js';

const verifyPassword = async (userId, password) => {
  const user = await UserModel.findById(userId).select('+password');
  if (!user) return { ok: false, status: 404, message: 'User not found' };
  if (!password) return { ok: false, status: 400, message: 'Password is required to confirm this action' };

  const isMatch = await bcryptjs.compare(password, user.password);
  if (!isMatch) return { ok: false, status: 401, message: 'Incorrect password' };

  return { ok: true, user };
};

// @route  DELETE /api/account/delete-self
// Works for any user. If the caller is an admin who still has team
// members depending on them, this is blocked — they must explicitly
// choose to transfer ownership or delete the whole team first, so a
// team is never silently orphaned by one click.
export const deleteSelf = async (req, res) => {
  try {
    const { password } = req.body;
    const check = await verifyPassword(req.userId, password);
    if (!check.ok) return res.status(check.status).json({ message: check.message });

    const { user } = check;

    if (user.role === 'admin') {
      const teamCount = await UserModel.countDocuments({ teamOwner: user._id });
      if (teamCount > 0) {
        return res.status(409).json({
          message: 'You still have team members. Transfer ownership or delete the whole team before deleting your own account.',
        });
      }
    }

    await TimeEntryModel.deleteMany({ user: user._id });
    await user.deleteOne();

    res.status(200).json({ message: 'Your account has been deleted' });
  } catch (error) {
    console.error('Delete self error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

// @route  POST /api/account/transfer-ownership
// Admin-only. Promotes another member of the admin's own team to
// admin, hands them everything (juniors, projects, pending invites),
// then deletes the original admin's own account.
export const transferOwnership = async (req, res) => {
  try {
    const { targetUserId, password } = req.body;
    const check = await verifyPassword(req.userId, password);
    if (!check.ok) return res.status(check.status).json({ message: check.message });

    const { user: admin } = check;

    if (!targetUserId) {
      return res.status(400).json({ message: 'Please choose a team member to transfer ownership to' });
    }
    if (targetUserId === admin._id.toString()) {
      return res.status(400).json({ message: 'Choose someone other than yourself' });
    }

    const target = await UserModel.findOne({ _id: targetUserId, teamOwner: admin._id });
    if (!target) {
      return res.status(404).json({ message: 'That user is not part of your team' });
    }

    // Promote the target to admin and make them the new root of the team
    target.role = 'admin';
    target.teamOwner = null;
    await target.save();

    // Hand every remaining junior, project, and pending invite over to the new admin
    await UserModel.updateMany(
      { teamOwner: admin._id, _id: { $ne: target._id } },
      { $set: { teamOwner: target._id } }
    );
    await ProjectModel.updateMany({ teamOwner: admin._id }, { $set: { teamOwner: target._id } });
    await InviteModel.updateMany({ invitedBy: admin._id }, { $set: { invitedBy: target._id } });

    // Remove the original admin's own account and their own time entries
    await TimeEntryModel.deleteMany({ user: admin._id });
    await admin.deleteOne();

    res.status(200).json({ message: `Ownership transferred to ${target.fullName}. Your account has been deleted.` });
  } catch (error) {
    console.error('Transfer ownership error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

// @route  DELETE /api/account/delete-team
// Admin-only. Irreversibly deletes the admin's own account, every
// team member they invited, all their projects, all their pending
// invites, and every time entry belonging to any of them.
export const deleteTeam = async (req, res) => {
  try {
    const { password } = req.body;
    const check = await verifyPassword(req.userId, password);
    if (!check.ok) return res.status(check.status).json({ message: check.message });

    const { user: admin } = check;

    const teamUserIds = await UserModel.find({ teamOwner: admin._id }).distinct('_id');
    const allUserIds = [...teamUserIds, admin._id];

    await TimeEntryModel.deleteMany({ user: { $in: allUserIds } });
    await ProjectModel.deleteMany({ teamOwner: admin._id });
    await InviteModel.deleteMany({ invitedBy: admin._id });
    await UserModel.deleteMany({ _id: { $in: teamUserIds } });
    await admin.deleteOne();

    res.status(200).json({ message: 'Your team and all associated data have been permanently deleted' });
  } catch (error) {
    console.error('Delete team error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};