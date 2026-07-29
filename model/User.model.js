import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    companyName: {
      type: String,
      trim: true,
      default: '',
    },
    jobTitle: {
      type: String,
      trim: true,
      default: '',
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    // Points to the admin who invited this person. Lets an admin's
    // dashboard show only their own invited team, not every user
    // on the platform. Null for people who signed up on their own
    // (or admins who registered with the admin code directly).
    teamOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      default: null,
    },
    // The Cloudinary-hosted image URL returned after upload.
    profilePicture: {
      type: String,
      default: '',
    },
    // Cloudinary's public_id for that same image. Kept separately from
    // the URL so a replacement upload can delete the old asset by id
    // instead of having to parse it back out of the URL.
    profilePictureId: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

const UserModel = mongoose.model('user', UserSchema);

export default UserModel;