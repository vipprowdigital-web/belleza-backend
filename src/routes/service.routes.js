import { Router } from "express";
import { ensureAuth } from "../middleware/authMiddleware.js";
import upload from "../config/multer.js";
import {
  createService,
  getServiceById,
  updateService,
  partiallyUpdateService,
  destroyServiceById,
  getAllActiveServices,
  getAllServices,
  getAllActiveServicesName,
} from "../controllers/service.controller.js";

const router = Router();

/* ================================
   🟢 Public Routes (No Auth Required)
   ================================ */
router.get("/public", getAllActiveServices);
router.get("/public/names", getAllActiveServicesName);
router.get("/public/:id", getServiceById);

/* ================================
   🔒 Admin-Protected Routes
   ================================ */
router.get("/", ensureAuth, getAllServices);
router.get("/:id", ensureAuth, getServiceById);

// Create Service (with optional thumbnail upload)
router.post(
  "/",
  ensureAuth,
  upload.fields([{ name: "thumbnail", maxCount: 1 }]),
  createService
);

// Full update (PUT)
router.put(
  "/:id",
  ensureAuth,
  upload.fields([{ name: "thumbnail", maxCount: 1 }]),
  updateService
);

// Partial update (PATCH)
router.patch("/:id", ensureAuth, partiallyUpdateService);

// Delete Service
router.delete("/:id", ensureAuth, destroyServiceById);

export default router;
