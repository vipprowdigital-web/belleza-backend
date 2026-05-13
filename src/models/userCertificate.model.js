// src/models/userCertificate.model.js

import mongoose from "mongoose";

/* ===============================
   📥 Download History Schema
================================ */
const downloadHistorySchema = new mongoose.Schema(
  {
    ip: String,
    userAgent: String,
    device: String,
    os: String,
    browser: String,
    downloadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

/* ===============================
   📜 User Certificate Schema
================================ */
const userCertificateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      match: [/^[0-9]{10}$/, "Invalid phone number"],
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    pdfUrl: {
      type: String,
      required: true, // uploaded by admin
    },

    pdfPublicId: {
      type: String,
      required: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    downloads: [downloadHistorySchema],
  },
  { timestamps: true, versionKey: false }
);

userCertificateSchema.index({ phone: 1, email: 1 });

export default mongoose.model("UserCertificate", userCertificateSchema);
