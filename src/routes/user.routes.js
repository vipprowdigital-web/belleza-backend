import { Router } from "express";
import {
  getProfile,
  updateProfileById,
} from "../controllers/user.controller.js";
import { ensureAuth } from "../middleware/authMiddleware.js";
import upload from "../config/multer.js";

const router = Router();

router.get("/profile/view", ensureAuth, getProfile);
router.post(
  "/profile/update",
  ensureAuth,
  upload.fields([{ name: "avatar", maxCount: 1 }]),
  updateProfileById
);

export default router;
