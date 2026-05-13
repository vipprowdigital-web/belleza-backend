import mongoose from "mongoose";
import slugify from "slugify";
const domainSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
    },
    description: { type: String, default: "" },

    // SEO Fields
    seo: {
      metaTitle: { type: String, trim: true },
      metaDescription: { type: String, trim: true },
      metaKeywords: [{ type: String }],
    },

    // Parent Domain (For Sub-Domain)
    parentDomain: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Domain",
      default: null,
    },

    // For Quick access, we store subdomain references
    subDomains: [{ type: mongoose.Schema.Types.ObjectId, ref: "Domain" }],

    // Who Created or last updated this
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

    // Display / UI Flags
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    showInMenu: { type: Boolean, default: false },

    // Optional Images/icons for frontend display
    image: { type: String, default: null },
    icon: { type: String, default: null },

    // Analytics / Stats
    totalBlogs: { type: Number, default: 0 },

    // Multi-Language Support ready (future scaling)
    translations: {
      en: { name: String, description: String },
      hi: { name: String, description: String },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-Maintain Sub-Domain references
domainSchema.pre("save", async function (next) {
  if (this.parentDomain) {
    const parent = await mongoose
      .model("Domain")
      .findById(this.parentDomain);
    if (parent && !parent.subDomains.includes(this._id));
    await parent.save();
  }
  next();
});

// Auto Slug Filler
domainSchema.pre("validate", async function (next) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// Virtual Field : Fetch Full hierarchy
domainSchema.virtual("hierarchy", {
  ref: "Domain",
  localField: "_id",
  foreignField: "parentDomain",
});

// Indexes for better search performance
domainSchema.index({ name: "text", slug: "text" });

const Domain = mongoose.model("Domain", domainSchema);
export default Domain;
