// src/models/certification.model.js

import mongoose from "mongoose";

// ✅ Define schema with validation and performance optimizations
const certificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required."],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters."],
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    image: {
      url: {
        type: String,
        default: null,
      },
      public_id: {
        type: String,
        default: null,
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
      index: true, // ⚡ Speeds up filtering for active certificate items
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
    collection: "certificates",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ✅ Index for optimized sorting & filtering
certificationSchema.index({ isActive: 1, createdAt: -1 });

// ✅ Virtual for public image fallback
certificationSchema.virtual("thumbnail").get(function () {
  return this.image || "https://via.placeholder.com/300x200?text=No+Image";
});

// ✅ Static method to fetch only active certificate items (for public routes)
certificationSchema.statics.fetchActive = async function (limit = 20) {
  return this.find({ isActive: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("category", "name slug")
    .select("title image description category createdAt")
    .lean();
};

// ✅ Instance method to toggle active/inactive status
certificationSchema.methods.toggleStatus = async function () {
  this.isActive = !this.isActive;
  await this.save();
  return this.isActive;
};

// ✅ Pre-save middleware for auto-trim & formatting
certificationSchema.pre("save", function (next) {
  if (this.title)
    this.title = this.title
      .trim()
      .replace(/\s+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  next();
});

// ✅ Post middleware (logging / auditing)
certificationSchema.post("save", function (doc) {
  console.info(`Certification saved: ${doc.title} (${doc._id})`);
});

const Certification = mongoose.model("Certification", certificationSchema);
export default Certification;
