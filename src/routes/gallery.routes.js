import { Router } from "express";
import { ensureAuth } from "../middleware/authMiddleware.js";
import upload from "../config/multer.js";

import {
  getAllGallery,
  getAllActiveGallery,
  getGalleryById,
  createGallery,
  updateGallery,
  partiallyUpdateGallery,
  destroyGalleryById,
} from "../controllers/gallery.controller.js";

const router = Router();

/* ================================
   🟢 Public Routes
   ================================ */

// ✅ Public - Get all active galleries (only active ones)
router.get("/active", getAllActiveGallery);

// ✅ Public - Get single gallery by ID
router.get("/:id", getGalleryById);

/* ================================
   🔒 Admin/Protected Routes (Require Auth)
   ================================ */

// ✅ Get all galleries (with pagination + search)
router.get("/", ensureAuth, getAllGallery);

// ✅ Create new gallery (with file upload)
router.post(
  "/",
  ensureAuth,
  upload.fields([{ name: "galleryMedia", maxCount: 1 }]),
  createGallery
);

// ✅ Update entire gallery (PUT)
router.put(
  "/:id",
  ensureAuth,
  upload.fields([{ name: "galleryMedia", maxCount: 1 }]),
  updateGallery
);

// ✅ Partial update (PATCH — toggle active, change title, etc.)
router.patch("/:id", ensureAuth, partiallyUpdateGallery);

// ✅ Delete gallery
router.delete("/:id", ensureAuth, destroyGalleryById);

export default router;