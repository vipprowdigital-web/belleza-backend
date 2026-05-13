// routes/course.routes.js
import { Router } from "express";
import {
  getAllActiveCourses,
  getCourseById,
  getAllCourses,
  createCourse,
  updateCourse,
  partiallyUpdateCourse,
  destroyCourseById,
  getAllActiveCoursesNames,
} from "../controllers/course.controller.js";

import { ensureAuth } from "../middleware/authMiddleware.js";
import upload from "../config/multer.js";

const router = Router();

/* ================================
   🟢 PUBLIC ROUTES
================================ */
router.get("/", getAllActiveCourses);
router.get("/:id", getCourseById);

router.get("/public/name", getAllActiveCoursesNames);

/* ================================
   🔒 ADMIN ROUTES
================================ */
router.get("/admin/all", ensureAuth, getAllCourses);

router.post(
  "/admin",
  ensureAuth,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "gallery_images", maxCount: 10 },
  ]),
  createCourse
);

router.put(
  "/admin/:id",
  ensureAuth,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "gallery_images", maxCount: 10 },
  ]),
  updateCourse
);

router.patch("/admin/:id", ensureAuth, partiallyUpdateCourse);

router.delete("/admin/:id", ensureAuth, destroyCourseById);

export default router;
