import mongoose from "mongoose";
import slugify from "slugify";

const seoSchema = new mongoose.Schema(
  {
    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },
    metaKeywords: [{ type: String, trim: true }],
  },
  { _id: false }
);

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      minlength: 3,
      maxlength: 150,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },
    thumbnail: {
      type: String,
      default: null,
      validate: {
        validator: (v) =>
          !v || /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i.test(v),
        message: "Invalid image URL format for thumbnail",
      },
    },
    gallery_images: [
      {
        type: String,
        validate: {
          validator: (v) =>
            !v || /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i.test(v),
          message: "Invalid image URL format in gallery",
        },
      },
    ],
    video_link: {
      type: String,
      validate: {
        validator: (v) =>
          !v ||
          /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\/.+/.test(v),
        message: "Invalid video URL",
      },
    },
    read_time: {
      type: String,
      match: /^[0-9]+( min| hr)?$/,
    },
    short_description: {
      type: String,
      trim: true,
      maxlength: [500, "Short description must be under 500 characters"],
    },
    description: { type: String, trim: true },
    seo: seoSchema,
    isActive: { type: Boolean, default: true, index: true },
    isFeature: { type: Boolean, default: false, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, versionKey: false }
);

// Generate slug automatically
blogSchema.pre("validate", function (next) {
  if (this.title)
    this.slug = slugify(this.title, { lower: true, strict: true });
  next();
});

blogSchema.index({
  title: "text",
  description: "text",
  "seo.metaKeywords": "text",
});

blogSchema.virtual("url").get(function () {
  return `/blog/${this.slug}`;
});

export default mongoose.model("Blog", blogSchema);
