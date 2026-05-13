// src/routes/userCertificate.routes.js

import { Router } from "express";
import {
  verifyUserCertificate,
  createUserCertificate,
  getAllUserCertificates,
  getUserCertificateById,
  updateUserCertificate,
  deleteUserCertificate,
} from "../controllers/userCertificate.controller.js";

import { ensureAuth } from "../middleware/authMiddleware.js";
import upload from "../config/multer.js";

const router = Router();

/* ================================
   🟢 PUBLIC ROUTE
================================ */
router.post("/verify", verifyUserCertificate);

/* ================================
   🔒 ADMIN ROUTES
================================ */
router.get("/admin", ensureAuth, getAllUserCertificates);

router.post(
  "/admin",
  ensureAuth,
  upload.single("certificate_pdf"),
  createUserCertificate
);

router.get("/admin/:id", ensureAuth, getUserCertificateById);
router.put(
  "/admin/:id",
  ensureAuth,
  upload.single("certificate_pdf"),
  updateUserCertificate
);
router.delete("/admin/:id", ensureAuth, deleteUserCertificate);

export default router;
