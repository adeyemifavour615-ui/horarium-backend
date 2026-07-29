import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    color: {
      type: String,
      default: '#FF6603',
    },
    // The admin whose team this project belongs to — same scoping
    // pattern as User.teamOwner, so a project is only visible to
    // the admin who made it and the juniors they invited.
    teamOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true,
    },
  },
  { timestamps: true }
);

const ProjectModel = mongoose.model('project', ProjectSchema);

export default ProjectModel;