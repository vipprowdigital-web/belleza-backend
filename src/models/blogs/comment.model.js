import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    blog: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Blog",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      index: true,
    },
    content: {
      type: String,
      required: [true, "Comment content is required."],
      trim: true,
      minlength: [1, "Comment cannot be empty."],
      maxlength: [2000, "Comment cannot exceed 2000 characters."],
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    dislikes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isEdited: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Virtual Field for nested replies
commentSchema.virtual("replies", {
  ref: "Comment",
  localField: "_id",
  foreignField: "parentComment",
});

// ✅ Method: Toggle Like
commentSchema.methods.toggleLike = async function (userId) {
  const userStr = userId.toString();
  const liked = this.likes.some((id) => id.toString() === userStr);

  if (liked) {
    // Unlike
    this.likes = this.likes.filter((id) => id.toString() !== userStr);
  } else {
    // Like and remove from dislikes
    this.likes.push(userId);
    this.dislikes = this.dislikes.filter((id) => id.toString() !== userStr);
  }

  await this.save();
  return this;
};

// ✅ Method: Toggle Dislike
commentSchema.methods.toggleDislike = async function (userId) {
  const userStr = userId.toString();
  const disliked = this.dislikes.some((id) => id.toString() === userStr);

  if (disliked) {
    // Undo dislike
    this.dislikes = this.dislikes.filter((id) => id.toString() !== userStr);
  } else {
    // Dislike and remove from likes
    this.dislikes.push(userId);
    this.likes = this.likes.filter((id) => id.toString() !== userStr);
  }

  await this.save();
  return this;
};

// Virtual for JSON output
commentSchema.set("toJSON", { virtuals: true });
commentSchema.set("toObject", { virtuals: true });

const Comment = mongoose.model("Comment", commentSchema);
export default Comment;
