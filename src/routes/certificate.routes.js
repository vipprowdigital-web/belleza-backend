import { Router } from "express";
import { ensureAuth } from "../middleware/authMiddleware.js";
import upload from "../config/multer.js";

import {
  getAllCertificate,
  getAllActiveCertificate,
  getCertificateById,
  createCertificate,
  updateCertificate,
  partiallyUpdateCertificate,
  destroyCertificateById,
} from "../controllers/certificate.controller.js";

const router = Router();

/* ================================
   🟢 Public Routes
   ================================ */

// ✅ Public - Get all active certificates (only active ones)
router.get("/active", getAllActiveCertificate);

// ✅ Public - Get single Certificate by ID
router.get("/:id", getCertificateById);

/* ================================
   🔒 Admin/Protected Routes (Require Auth)
   ================================ */

// ✅ Get all certificates (with pagination + search)
router.get("/", ensureAuth, getAllCertificate);

// ✅ Create new Certificate (with file upload)
router.post(
  "/",
  ensureAuth,
  upload.fields([{ name: "certificateMedia", maxCount: 1 }]),
  createCertificate
);

// ✅ Update entire Certificate (PUT)
router.put(
  "/:id",
  ensureAuth,
  upload.fields([{ name: "certificateMedia", maxCount: 1 }]),
  updateCertificate
);

// ✅ Partial update (PATCH — toggle active, change title, etc.)
router.patch("/:id", ensureAuth, partiallyUpdateCertificate);

// ✅ Delete Certificate
router.delete("/:id", ensureAuth, destroyCertificateById);

export default router;