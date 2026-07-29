import UserModel from '../model/User.model.js';

// Must run AFTER `protect` — relies on req.userId already being set from the JWT.
export const requireAdmin = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.userId);
    if (!user) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error('Admin check error:', error.message);
    res.status(500).json({ message: 'Something went wrong.' });
  }
};