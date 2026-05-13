import multer from "multer";
import path from "path";
import fs from "node:fs";

// Temporary upload directory
const uploadDir = "uploads/temp";

// Ensure folder exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage (temporary, Cloudinary will store permanently)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

// File Type Validation (images + videos)
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowed = /\.(jpg|jpeg|png|webp|pdf|gif|mp4|mov|avi)$/; // ✅ RegExp
  if (allowed.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only image/vidoe file are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // Max 10 MB per file
});

export default upload;
