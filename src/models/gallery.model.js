import mongoose from "mongoose";

// ✅ Define schema with validation and performance optimizations
const gallerySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required."],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters."],
    },

    // category: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Category",
    //   default: null,
    // },

    category: {
      type: String,
      default: null,
      index: true,
    },

    image: {
      type: String,
      default: null,
      validate: {
        validator: (v) =>
          !v || /^https?:\/\/.+\.(jpg|jpeg|png|webp|avif|gif)$/i.test(v),
        message: "Image must be a valid image URL.",
      },
    },

    description: {
      type: String,
      trim: true,
      maxlength: [20000, "Description cannot exceed 20,000 characters."],
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true, // ⚡ Speeds up filtering for active gallery items
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
    versionKey: false,
    collection: "galleries",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ✅ Index for optimized sorting & filtering
gallerySchema.index({ isActive: 1, createdAt: -1 });

// ✅ Virtual for public image fallback
gallerySchema.virtual("thumbnail").get(function () {
  return this.image || "https://via.placeholder.com/300x200?text=No+Image";
});

// ✅ Static method to fetch only active gallery items (for public routes)
gallerySchema.statics.fetchActive = async function (limit = 20) {
  return this.find({ isActive: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("category", "name slug")
    .select("title image description category createdAt")
    .lean();
};

// ✅ Instance method to toggle active/inactive status
gallerySchema.methods.toggleStatus = async function () {
  this.isActive = !this.isActive;
  await this.save();
  return this.isActive;
};

// ✅ Pre-save middleware for auto-trim & formatting
gallerySchema.pre("save", function (next) {
  if (this.title)
    this.title = this.title
      .trim()
      .replace(/\s+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  next();
});

// ✅ Post middleware (logging / auditing)
gallerySchema.post("save", function (doc) {
  console.info(`Gallery saved: ${doc.title} (${doc._id})`);
});

const Gallery = mongoose.model("Gallery", gallerySchema);
export default Gallery;
