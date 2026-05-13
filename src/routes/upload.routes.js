// Backend/src/routes/upload.routes.js

import express from "express";
import multer from "multer";
import {
  uploadToCloudinary,
  destroyFromCloudinary,
} from "../utils/cloudinaryService.js";
import { ensureAuth } from "../middleware/authMiddleware.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// ✅ Upload Image (already existing)
router.post("/image", ensureAuth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided." });
    }

    const result = await uploadToCloudinary(req.file.path, "editor-images");

    res.status(200).json({
      message: "Image uploaded successfully!",
      url: result.secure_url,
      public_id: result.public_id, // 👈 store this in your editor or database
    });
  } catch (error) {
    console.error("Upload error:", error.message);
    res.status(500).json({ message: "Image upload failed." });
  }
});

// ✅ NEW: Delete Image from Cloudinary
router.delete("/image", ensureAuth, async (req, res) => {
  try {
    const { public_id } = req.body;

    if (!public_id) {
      return res.status(400).json({ message: "public_id is required" });
    }

    const result = await destroyFromCloudinary(public_id);
    res.status(200).json({
      message: "Image deleted successfully!",
      result,
    });
  } catch (error) {
    console.error("Cloudinary delete error:", error.message);
    res.status(500).json({ message: "Image delete failed." });
  }
});

export default router;
