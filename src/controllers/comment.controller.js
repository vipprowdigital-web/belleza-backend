import Blog from "../models/blogs/blog.model.js";
import Comment from "../models/blogs/comment.model.js";

// Create a new Comment or Reply
export const addComment = async (req, res) => {
  try {
    const { blogId, parentComment, content } = req.body;
    const userId = req.user?._id || req.body.userId; // Handle for admin testing

    if (!blogId || !content) {
      return res
        .status(400)
        .json({ message: "Blog ID and content are required." });
    }

    const blog = await Blog.findById(blogId);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found." });
    }

    const comment = await Comment.create({
      blog: blogId,
      user: userId,
      parentComment: parentComment || null,
      content,
    });

    res.status(201).json({
      message: "Comment added successfully.",
      data: comment,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// Get all comments for a specific blog (with nested replies)
export const getCommentByBlog = async (req, res) => {
  try {
    const { blogId } = req.params;

    const comments = await Comment.find({ blog: blogId, parentComment: null })
      .populate("user", "name email")
      .populate({
        path: "replies",
        populate: { path: "user", select: "name email" },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Comments fetched successfully.",
      data: comments,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// Like or Unlike a comment
export const toggleLike = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user?._id || req.body.userId; // Handle for admin testing

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    await comment.toggleLike(userId);

    return res.status(200).json({
      message: "Like status updated.",
      likesCount: comment.likes.length,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// Dislike or Undo Dislike a comment
export const toggleDislike = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user?._id || req.body.userId; // Handle for admin testing

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    await comment.toggleDislike(userId);

    return res.status(200).json({
      message: "Dislike status updated.",
      dislikesCount: comment.dislikes.length,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// Edit Comment
export const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user?._id || req.body.userId; // Handle for admin testing

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    // Check ownership
    if (comment.user.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "You are not authorized to edit this comment." });
    }

    comment.content = content || comment.content;
    comment.isEdited = true;
    await comment.save();

    return res
      .status(200)
      .json({ message: "Comment updated successfully.", data: comment });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// Delete Comment
export const destroyCommentById = async (req, res) => {
  try {
    const { commentId } = req.params;

    const userId = req.user?._id || req.body.userId; // Handle for admin testing

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    // Check ownership
    if (comment.user.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "You are not authorized to edit this comment." });
    }

    // Delete nested replies too
    await Comment.deleteMany({
      $or: [{ _id: commentId }, { parentComment: commentId }],
    });

    return res
      .status(200)
      .json({ message: "Comment and its replies deleted successfully." });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};
