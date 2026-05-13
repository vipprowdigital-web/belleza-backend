// belleza_beauty_school_backend/src/utils/cloudinaryUrl.js

import cloudinary from "../config/cloudinary.js";

export function getOptimizedImage(publicId, width = 800) {
  if (!publicId) return null;

  return cloudinary.url(publicId, {
    secure: true,
    fetch_format: "auto",
    quality: "auto",
    width,
    crop: "scale",
  });
}
