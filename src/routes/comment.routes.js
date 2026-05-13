import { Router } from "express";
import { ensureAuth } from "../middleware/authMiddleware.js";
import {
  addComment,
  destroyCommentById,
  getCommentByBlog,
  toggleDislike,
  toggleLike,
  updateComment,
} from "../controllers/comment.controller.js";

const router = Router();

// Add Comment or Reply
router.post("/", ensureAuth, addComment);

// Get all comments for a blog
router.get("/:blogId", getCommentByBlog);

// Like/Unlike a Comment
router.patch("/:commentId/like", ensureAuth, toggleLike);

// Dislike/Undo Dislike a Comment
router.patch("/:commentId/dislike", ensureAuth, toggleDislike);

// Edit Comment
router.patch("/:commentId", ensureAuth, updateComment);

// Destroy Comment
router.delete("/:commentId", ensureAuth, destroyCommentById);

export default router;
