import { Router } from "express";
import { ensureAuth } from "../middleware/authMiddleware.js";
import {
  createCategory,
  destroyCategoryById,
  getCategories,
  getCategoryById,
  getPublicCategories,
  partiallyUpdateCategory,
  updateCategory,
} from "../controllers/category.controller.js";
import upload from "../config/multer.js";

const router = Router();

router.get("/public", getPublicCategories);

router.get("/", ensureAuth, getCategories);

// Get Categroy by ID
router.get("/:id", ensureAuth, getCategoryById);

// Create category with file upload
router.post(
  "/",
  ensureAuth,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "icon", maxCount: 1 },
  ]),
  createCategory
);

// update category with file upload
router.put(
  "/:id",
  ensureAuth,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "icon", maxCount: 1 },
  ]),
  updateCategory
);

// PATCH for partial updates (like toggling isActive)
router.patch(
  "/:id", // <-- Add this new route
  ensureAuth,
  partiallyUpdateCategory // Use the new controller (no multer needed)
);

router.delete("/:id", ensureAuth, destroyCategoryById);

export default router;
