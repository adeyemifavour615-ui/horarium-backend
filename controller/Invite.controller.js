import crypto from 'crypto';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import InviteModel from '../model/Invite.model.js';
import UserModel from '../model/User.model.js';
import { sendInviteEmail, sendWelcomeEmail } from '../utils/mailer.js';
import { createNotification } from './Notification.controller.js';

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// @route  POST /api/admin/invite
// Admin-only. Creates (or refreshes) a pending invite for an email address
// and sends the invite link.
export const createInvite = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await UserModel.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: 'A user with this email already exists' });
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // If there's already a pending invite for this email from this admin,
    // refresh it with a new token instead of creating a duplicate.
    let invite = await InviteModel.findOne({ email: normalizedEmail, invitedBy: req.userId, status: 'pending' });
    if (invite) {
      invite.token = token;
      invite.expiresAt = expiresAt;
      await invite.save();
    } else {
      invite = await InviteModel.create({
        email: normalizedEmail,
        invitedBy: req.userId,
        token,
        expiresAt,
      });
    }

    const admin = await UserModel.findById(req.userId);
    const inviteLink = `${FRONTEND_URL}/accept-invite?token=${token}`;

    await sendInviteEmail(normalizedEmail, admin.fullName, inviteLink);

    res.status(201).json({ message: 'Invite sent successfully', invite });
  } catch (error) {
    console.error('Create invite error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

// @route  GET /api/admin/invites
// Admin-only. Lists this admin's own pending invites.
export const getMyInvites = async (req, res) => {
  try {
    const invites = await InviteModel.find({ invitedBy: req.userId, status: 'pending' }).sort({ createdAt: -1 });
    res.status(200).json({ invites });
  } catch (error) {
    console.error('Get invites error:', error.message);
    res.status(500).json({ message: 'Something went wrong.' });
  }
};

// @route  GET /api/invite/:token
// Public. Lets the accept-invite page confirm the invite is real before
// showing the signup form.
export const getInviteByToken = async (req, res) => {
  try {
    const invite = await InviteModel.findOne({ token: req.params.token }).populate('invitedBy', 'fullName companyName');

    if (!invite || invite.status !== 'pending') {
      return res.status(404).json({ message: 'This invite link is invalid or has already been used' });
    }

    if (invite.expiresAt < new Date()) {
      invite.status = 'expired';
      await invite.save();
      return res.status(410).json({ message: 'This invite link has expired. Ask for a new one.' });
    }

    res.status(200).json({
      email: invite.email,
      adminName: invite.invitedBy.fullName,
      companyName: invite.invitedBy.companyName,
    });
  } catch (error) {
    console.error('Get invite by token error:', error.message);
    res.status(500).json({ message: 'Something went wrong.' });
  }
};

// @route  POST /api/invite/accept
// Public. Creates the account tied to the inviting admin's team.
export const acceptInvite = async (req, res) => {
  const { token, fullName, password } = req.body;

  try {
    if (!token || !fullName || !password) {
      return res.status(400).json({ message: 'Full name and password are required' });
    }

    const invite = await InviteModel.findOne({ token });
    if (!invite || invite.status !== 'pending') {
      return res.status(404).json({ message: 'This invite link is invalid or has already been used' });
    }

    if (invite.expiresAt < new Date()) {
      invite.status = 'expired';
      await invite.save();
      return res.status(410).json({ message: 'This invite link has expired. Ask for a new one.' });
    }

    const existingUser = await UserModel.findOne({ email: invite.email });
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    const newUser = await UserModel.create({
      fullName,
      email: invite.email,
      password: hashedPassword,
      role: 'user',
      teamOwner: invite.invitedBy,
    });

    invite.status = 'accepted';
    await invite.save();

    createNotification(
      invite.invitedBy,
      `${newUser.fullName} accepted your invite and joined your team`,
      'invite_accepted'
    );

    const jwtToken = generateToken(newUser._id);

    sendWelcomeEmail(newUser.email, newUser.fullName).catch((error) => {
      console.error('Welcome email failed to send:', error.message);
    });

    res.status(201).json({
      message: 'Account created successfully',
      token: jwtToken,
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('Accept invite error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};