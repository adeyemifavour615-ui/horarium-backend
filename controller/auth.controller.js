import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import UserModel from '../model/User.model.js';
import { sendWelcomeEmail } from '../utils/mailer.js';
import { uploadBufferToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

// @route  POST /api/auth/register
export const registerUser = async (req, res) => {
  const { fullName, email, password, companyName, jobTitle, adminCode } = req.body;

  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Full name, email, and password are required' });
    }

    const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    // Admin code is optional. If the field was left blank, this is a normal
    // signup. If it was filled in but doesn't match, we reject it explicitly
    // rather than silently downgrading to a regular account.
    let role = 'user';
    if (adminCode) {
      if (adminCode !== process.env.ADMIN_SIGNUP_CODE) {
        return res.status(403).json({ message: 'Invalid admin code' });
      }
      role = 'admin';
    }

    const saltRounds = 10;
    const hashedPassword = await bcryptjs.hash(password, saltRounds);

    const newUser = await UserModel.create({
      fullName,
      email,
      password: hashedPassword,
      companyName,
      jobTitle,
      role,
    });

    const token = generateToken(newUser._id);

    // Fire the welcome email but never let a mail failure break signup —
    // the account is already created at this point, so we just log and move on.
    sendWelcomeEmail(newUser.email, newUser.fullName).catch((error) => {
      console.error('Welcome email failed to send:', error.message);
    });

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        companyName: newUser.companyName,
        jobTitle: newUser.jobTitle,
        role: newUser.role,
        profilePicture: newUser.profilePicture,
      },
    });
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

// @route  POST /api/auth/login
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await UserModel.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      message: 'Logged in successfully',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        companyName: user.companyName,
        jobTitle: user.jobTitle,
        role: user.role,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

// @route  GET /api/auth/me
export const getCurrentUser = async (req, res) => {
  try {
    const user = await UserModel.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ user });
  } catch (error) {
    console.error('Get current user error:', error.message);
    res.status(500).json({ message: 'Something went wrong.' });
  }
};

// @route  PATCH /api/auth/me
// Lets a logged-in user update their own name/email/company/job title.
// Password changes go through the separate changePassword endpoint below.
export const updateProfile = async (req, res) => {
  try {
    const { fullName, email, companyName, jobTitle } = req.body;

    const user = await UserModel.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (email && email.toLowerCase() !== user.email) {
      const existing = await UserModel.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(409).json({ message: 'That email is already in use by another account' });
      }
      user.email = email.toLowerCase();
    }

    if (fullName !== undefined) user.fullName = fullName.trim();
    if (companyName !== undefined) user.companyName = companyName;
    if (jobTitle !== undefined) user.jobTitle = jobTitle;

    await user.save();

    res.status(200).json({
      message: 'Profile updated',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        companyName: user.companyName,
        jobTitle: user.jobTitle,
        role: user.role,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

// @route  POST /api/auth/upload-profile-picture
// Accepts a single image file (multipart/form-data, field name
// "profilePicture"), uploads it to Cloudinary, and stores the
// resulting secure URL + public_id on the user document — not the
// file data itself.
export const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file was uploaded' });
    }

    const user = await UserModel.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const result = await uploadBufferToCloudinary(req.file.buffer, {
      folder: 'horarium/avatars',
      public_id: `${req.userId}-${Date.now()}`,
      resource_type: 'image',
    });

    // Remove the previous avatar from Cloudinary now that the new one
    // has uploaded successfully, so replacing a photo doesn't leave
    // orphaned images sitting in the account. Best-effort: if the old
    // asset is already gone (or there wasn't one) this is a no-op.
    const previousPublicId = user.profilePictureId;

    user.profilePicture = result.secure_url;
    user.profilePictureId = result.public_id;
    await user.save();

    if (previousPublicId) {
      deleteFromCloudinary(previousPublicId).catch((error) => {
        console.error('Failed to delete previous avatar from Cloudinary:', error.message);
      });
    }

    res.status(200).json({
      message: 'Profile picture updated',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        companyName: user.companyName,
        jobTitle: user.jobTitle,
        role: user.role,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error('Upload profile picture error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

// @route  PATCH /api/auth/change-password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }

    const user = await UserModel.findById(req.userId).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcryptjs.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = await bcryptjs.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};