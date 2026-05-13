import mongoose from "mongoose";
import slugify from "slugify";

const policySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      require: [true, "Policy title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    slug: {
      type: String,
      require: [true, "Slug is required"],
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    description: { type: String, default: " ", trim: true },
    isActive: { type: Boolean, default: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Auto-Generate Slug (Pre Save)
policySchema.pre("validate", function (next) {
  if (this.title && this.slug) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

// Virtual Field
policySchema.virtual("policy-url").get(function () {
  return `/policy/${slug}`;
});

// Indexs for fast performance
policySchema.index({
  title: "text",
  description: "text",
});

const Policy = mongoose.model("Policy", policySchema);
export default Policy;
