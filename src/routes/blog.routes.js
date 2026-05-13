// routes/blog.routes.js
import { Router } from "express";
import {
  getAllActiveBlogs,
  getBlogById,
  getAllBlogs,
  createBlog,
  updateBlog,
  partiallyUpdateBlog,
  destroyBlogById,
} from "../controllers/blog.controller.js";

import { ensureAuth } from "../middleware/authMiddleware.js";
import upload from "../config/multer.js";

const router = Router();

/* ================================
   🟢 PUBLIC ROUTES
================================ */
router.get("/", getAllActiveBlogs);
router.get("/:id", getBlogById);

/* ================================
   🔒 ADMIN ROUTES
================================ */
router.get("/admin/all", ensureAuth, getAllBlogs);

router.post(
  "/admin",
  ensureAuth,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "gallery_images", maxCount: 10 },
  ]),
  createBlog
);

router.put(
  "/admin/:id",
  ensureAuth,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "gallery_images", maxCount: 10 },
  ]),
  updateBlog
);

router.patch("/admin/:id", ensureAuth, partiallyUpdateBlog);
router.delete("/admin/:id", ensureAuth, destroyBlogById);

export default router;
