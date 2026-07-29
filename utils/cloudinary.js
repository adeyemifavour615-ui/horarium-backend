import { v2 as cloudinary } from 'cloudinary';

// Configured lazily on first use (not at import time) so this never runs
// before dotenv has loaded the CLOUDINARY_* vars into process.env.
let configured = false;

const getCloudinary = () => {
  if (!configured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    configured = true;
  }
  return cloudinary;
};

// Multer gives us the file as an in-memory buffer (see Upload.middleware.js).
// Cloudinary's SDK doesn't accept a raw buffer directly, so we pipe it
// through an upload_stream and wrap the callback API in a promise.
export const uploadBufferToCloudinary = (buffer, options = {}) => {
  const cloudinaryInstance = getCloudinary();

  return new Promise((resolve, reject) => {
    const stream = cloudinaryInstance.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
};

export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  const cloudinaryInstance = getCloudinary();
  await cloudinaryInstance.uploader.destroy(publicId);
};

export default getCloudinary;
