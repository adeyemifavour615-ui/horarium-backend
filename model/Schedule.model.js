import mongoose from 'mongoose';

// One entry per day of the week. isWorkDay=false means the employee
// isn't expected to work that day at all (startTime/endTime are ignored).
const DayScheduleSchema = new mongoose.Schema(
  {
    isWorkDay: {
      type: Boolean,
      default: false,
    },
    // Stored as "HH:mm" 24-hour strings (e.g. "09:00") rather than Date
    // objects, since these represent a recurring daily time-of-day, not
    // a specific date.
    startTime: {
      type: String,
      default: '09:00',
    },
    endTime: {
      type: String,
      default: '17:00',
    },
  },
  { _id: false }
);

const ScheduleSchema = new mongoose.Schema(
  {
    // The employee this schedule belongs to. One schedule document per
    // employee — editing re-saves the whole week rather than creating
    // new documents each time.
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true,
      unique: true,
    },
    // The admin who owns this employee's team, kept alongside `employee`
    // so schedule lookups for a whole team don't need a extra join back
    // through the User model.
    teamOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true,
    },
    monday: { type: DayScheduleSchema, default: () => ({}) },
    tuesday: { type: DayScheduleSchema, default: () => ({}) },
    wednesday: { type: DayScheduleSchema, default: () => ({}) },
    thursday: { type: DayScheduleSchema, default: () => ({}) },
    friday: { type: DayScheduleSchema, default: () => ({}) },
    saturday: { type: DayScheduleSchema, default: () => ({}) },
    sunday: { type: DayScheduleSchema, default: () => ({}) },
  },
  { timestamps: true }
);

const ScheduleModel = mongoose.model('schedule', ScheduleSchema);

export default ScheduleModel;