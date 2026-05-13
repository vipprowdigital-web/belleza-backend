import mongoose from "mongoose";

// ✅ Define schema with strict validation and performance optimizations
const serviceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required."],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters."],
    },

    domain: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Domain",
      required: true,
      index: true,
    },

    subHeading: {
      type: String,
      trim: true,
      maxlength: [300, "SubHeading cannot exceed 300 characters."],
      default: null,
    },

    description: {
      type: String,
      required: [true, "Description is required."],
      trim: true,
      minlength: [10, "Description must be at least 10 characters long."],
      maxlength: [20000, "Description cannot exceed 20000 characters."],
    },

    thumbnail: {
      type: String,
      default: null,
      validate: {
        validator: (v) =>
          !v || /^https?:\/\/.+\.(jpg|jpeg|png|webp|avif|gif)$/i.test(v),
        message: "Thumbnail must be a valid image URL.",
      },
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true, // ⚡ Speeds up queries for active services
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
    collection: "services",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ✅ Index for faster sorting by date and filtering by activity
serviceSchema.index({ isActive: 1, createdAt: -1 });

// ✅ Virtual field for truncated description
serviceSchema.virtual("shortDescription").get(function () {
  return this.description.length > 120
    ? this.description.substring(0, 117) + "..."
    : this.description;
});

// ✅ Static method to fetch only active services (public API)
serviceSchema.statics.fetchActive = async function (limit = 10) {
  return this.find({ isActive: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("title subHeading description thumbnail")
    .lean();
};

// ✅ Instance method to toggle active/inactive status
serviceSchema.methods.toggleStatus = async function () {
  this.isActive = !this.isActive;
  await this.save();
  return this.isActive;
};

// ✅ Pre-save middleware to auto-capitalize Title & subHeading
serviceSchema.pre("save", function (next) {
  if (this.title)
    this.title = this.title.trim().replace(/\b\w/g, (c) => c.toUpperCase());
  if (this.subHeading)
    this.subHeading = this.subHeading
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  next();
});

// ✅ Post middleware for logging or auditing
serviceSchema.post("save", function (doc) {
  console.info(`📝 Service saved: ${doc.name} (${doc._id})`);
});

const Service = mongoose.model("Service", serviceSchema);
export default Service;
