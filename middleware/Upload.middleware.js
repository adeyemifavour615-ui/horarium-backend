import multer from 'multer';

// Cloudinary needs the raw file bytes, not a path on our own disk, so
// we keep the upload in memory and hand the buffer straight to
// uploadBufferToCloudinary (see auth.controller.js) instead of writing
// it to /uploads first.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed'), false);
  }
  cb(null, true);
};

export const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
});
