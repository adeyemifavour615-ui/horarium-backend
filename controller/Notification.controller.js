import NotificationModel from '../model/Notification.model.js';

// Reusable helper other controllers call directly (not an HTTP route) —
// keeps the "create a notification" logic in one place.
export const createNotification = async (recipientId, message, type = 'general') => {
  try {
    await NotificationModel.create({ recipient: recipientId, message, type });
  } catch (error) {
    // A failed notification should never break the action that triggered it
    // (e.g. accepting an invite should still succeed even if this fails).
    console.error('Create notification error:', error.message);
  }
};

// @route  GET /api/notifications
export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await NotificationModel.find({ recipient: req.userId })
      .sort({ createdAt: -1 })
      .limit(30);

    res.status(200).json({ notifications });
  } catch (error) {
    console.error('Get notifications error:', error.message);
    res.status(500).json({ message: 'Something went wrong.' });
  }
};

// @route  PATCH /api/notifications/:id/read
export const markAsRead = async (req, res) => {
  try {
    const notification = await NotificationModel.findOne({ _id: req.params.id, recipient: req.userId });
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.read = true;
    await notification.save();

    res.status(200).json({ message: 'Marked as read', notification });
  } catch (error) {
    console.error('Mark as read error:', error.message);
    res.status(500).json({ message: 'Something went wrong.' });
  }
};

// @route  PATCH /api/notifications/read-all
export const markAllAsRead = async (req, res) => {
  try {
    await NotificationModel.updateMany({ recipient: req.userId, read: false }, { $set: { read: true } });
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error.message);
    res.status(500).json({ message: 'Something went wrong.' });
  }
};