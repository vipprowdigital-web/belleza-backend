import mongoose from "mongoose";

// ✅ Define schema with strict validation and performance optimizations
const testimonialSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters."],
    },

    designation: {
      type: String,
      trim: true,
      maxlength: [100, "Designation cannot exceed 100 characters."],
      default: null,
    },

    description: {
      type: String,
      required: [true, "Description is required."],
      trim: true,
      minlength: [10, "Description must be at least 10 characters long."],
      maxlength: [20000, "Description cannot exceed 20000 characters."],
    },

    avatar: {
      type: String,
      default: null,
      validate: {
        validator: (v) =>
          !v || /^https?:\/\/.+\.(jpg|jpeg|png|webp|avif|gif)$/i.test(v),
        message: "Avatar must be a valid image URL.",
      },
    },

    rating: {
      type: Number,
      required: true,
      min: [1, "Minimum rating is 1."],
      max: [5, "Maximum rating is 5."],
      default: 5,
      validate: {
        validator: Number.isInteger,
        message: "Rating must be an integer value.",
      },
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

    isActive: {
      type: Boolean,
      default: true,
      index: true, // ⚡ Speeds up queries for active testimonials
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false, // Removes __v field
    collection: "testimonials",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ✅ Index for faster sorting by date and filtering by activity
testimonialSchema.index({ isActive: 1, createdAt: -1 });

// ✅ Virtual field for truncated description
testimonialSchema.virtual("shortDescription").get(function () {
  return this.description.length > 120
    ? this.description.substring(0, 117) + "..."
    : this.description;
});

// ✅ Static method to fetch only active testimonials (public API)
testimonialSchema.statics.fetchActive = async function (limit = 10) {
  return this.find({ isActive: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("name designation description avatar rating")
    .lean();
};

// ✅ Instance method to toggle active/inactive status
testimonialSchema.methods.toggleStatus = async function () {
  this.isActive = !this.isActive;
  await this.save();
  return this.isActive;
};

// ✅ Pre-save middleware to auto-capitalize name & designation
testimonialSchema.pre("save", function (next) {
  if (this.name)
    this.name = this.name.trim().replace(/\b\w/g, (c) => c.toUpperCase());
  if (this.designation)
    this.designation = this.designation
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  next();
});

// ✅ Post middleware for logging or auditing
testimonialSchema.post("save", function (doc) {
  console.info(`📝 Testimonial saved: ${doc.name} (${doc._id})`);
});

const Testimonial = mongoose.model("Testimonial", testimonialSchema);
export default Testimonial;
