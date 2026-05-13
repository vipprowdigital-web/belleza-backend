import { Router } from "express";
import { ensureAuth } from "../middleware/authMiddleware.js";
import upload from "../config/multer.js";
import {
  createDomain,
  destroyDomainById,
  getDomainById,
  getDomains,
  getPublicDomains,
  partiallyUpdateDomain,
  updateDomain,
} from "../controllers/domain.controller.js";

const router = Router();

router.get("/public", getPublicDomains);

router.get("/", ensureAuth, getDomains);

// Get Domain by ID
router.get("/:id", ensureAuth, getDomainById);

// Create domain with file upload
router.post(
  "/",
  ensureAuth,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "icon", maxCount: 1 },
  ]),
  createDomain,
);

// update domain with file upload
router.put(
  "/:id",
  ensureAuth,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "icon", maxCount: 1 },
  ]),
  updateDomain,
);

// PATCH for partial updates (like toggling isActive)
router.patch("/:id", ensureAuth, partiallyUpdateDomain);

router.delete("/:id", ensureAuth, destroyDomainById);

export default router;
