const { v2: cloudinary } = require("cloudinary");

function getCloudinary() {
  const configuration = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  };
  const missing = Object.entries(configuration)
    .filter(([, value]) => !value?.trim())
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Missing Cloudinary configuration: ${missing.join(", ")}`);
  }

  cloudinary.config({ ...configuration, secure: true });
  return cloudinary;
}

module.exports = getCloudinary;
