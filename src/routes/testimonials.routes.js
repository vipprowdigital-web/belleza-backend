import { Router } from "express";
import { ensureAuth } from "../middleware/authMiddleware.js";
import upload from "../config/multer.js";
import {
  createTestimonial,
  getTestimonials,
  getTestimonialById,
  updateTestimonial,
  partiallyUpdateTestimonial,
  destroyTestimonialById,
  getAllActiveTestimonials,
  getActiveTestimonialById,
} from "../controllers/testimonial.controller.js";

const router = Router();

/* ================================
   🟢 PUBLIC ROUTES
================================ */
router.get("/public", getAllActiveTestimonials);
router.get("/public/:id", getActiveTestimonialById);

/* ================================
   🔒 ADMIN ROUTES
================================ */

// ✅ Get all testimonials (paginated)
router.get("/", ensureAuth, getTestimonials);

// ✅ Get testimonial by ID
router.get("/:id", ensureAuth, getTestimonialById);

// ✅ Create testimonial (with avatar upload)
router.post(
  "/",
  ensureAuth,
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  createTestimonial,
);

// ✅ Update testimonial (with avatar upload)
router.put(
  "/:id",
  ensureAuth,
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  updateTestimonial,
);

// ✅ Partially update testimonial (toggle isActive, etc.)
router.patch("/:id", ensureAuth, partiallyUpdateTestimonial);

// ✅ Delete testimonial
router.delete("/:id", ensureAuth, destroyTestimonialById);

export default router;
