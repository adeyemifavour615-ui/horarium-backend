import mongoose from 'mongoose';

const TimeEntrySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      default: null, // null while a timer is actively running
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    source: {
      type: String,
      enum: ['timer', 'manual'],
      default: 'timer',
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'project',
      default: null, // null = no project selected
    },
  },
  { timestamps: true }
);

const TimeEntryModel = mongoose.model('timeEntry', TimeEntrySchema);

export default TimeEntryModel;