import { Router } from "express";
import { ensureAuth } from "../middleware/authMiddleware.js";
import upload from "../config/multer.js";

import {
  getAllGallery,
  getGalleryById,
  createGallery,
  updateGallery,
  partiallyUpdateGallery,
  destroyGalleryById,
  getFrontendGalleries,
} from "../controllers/gallery.controller.js";

const router = Router();

/* ================================
   🟢 FRONTEND ROUTES (Display Data - No Auth Required)
   ================================ */

// ✅ Frontend - Get active galleries by subdomain
router.get("/frontend", getFrontendGalleries);

/* ================================
   🔒 ADMIN ROUTES (Manage Data - Auth Required)
   ================================ */

// ✅ Get all galleries (with pagination + search, branch-specific, all statuses)
router.get("/", ensureAuth, getAllGallery);

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