import mongoose from "mongoose";
import slugify from "slugify";
const categorySchema = new mongoose.Schema(
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

    // Parent Category (For Sub-Category)
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    // For Quick access, we store subcategory references
    subCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],

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

// Auto-Maintain Sub-Category references
categorySchema.pre("save", async function (next) {
  if (this.parentCategory) {
    const parent = await mongoose
      .model("Category")
      .findById(this.parentCategory);
    if (parent && !parent.subCategories.includes(this._id));
    await parent.save();
  }
  next();
});

// Auto Slug Filler
categorySchema.pre("validate", async function (next) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// Virtual Field : Fetch Full hierarchy
categorySchema.virtual("hierarchy", {
  ref: "Category",
  localField: "_id",
  foreignField: "parentCategory",
});

// Indexes for better search performance
categorySchema.index({ name: "text", slug: "text" });

const Category = mongoose.model("Category", categorySchema);
export default Category;
