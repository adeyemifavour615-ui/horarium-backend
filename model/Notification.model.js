import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['invite_accepted', 'project_created', 'schedule_updated', 'general'],
      default: 'general',
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const NotificationModel = mongoose.model('notification', NotificationSchema);

export default NotificationModel;