import slugify from "slugify";
import Category from "../models/blogs/category.model.js";
import {
  destroyFromCloudinary,
  uploadToCloudinary,
} from "../utils/cloudinaryService.js";

export const getPublicCategories = async (req, res) => {
  try {
    // Fetch categories name
    const categories = await Category.find()
      .select("name")
      .populate("parentCategory", "name _id")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Categories Name fetched successfully.",
      data: categories,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Error", error: error.message });
  }
};

export const getCategories = async (req, res) => {
  try {
    // Extract query params (with defaults)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    // Calculate how many to skip
    const skip = (page - 1) * limit;

    // Fetch total count for pagination
    const total = await Category.countDocuments();

    // Fetch paginated categories
    const categories = await Category.find()
      .populate("createdBy", "name email")
      .populate("parentCategory", "name _id") // 👈 REQUIRED
      .sort({ createdAt: -1 }) // latest first
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      message: "Categories fetched successfully.",
      data: categories,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Error", error: error.message });
  }
};

// GET Request
export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    // Find category by ID and populate references if needed
    const category = await Category.findById(id)
      .populate("createdBy", "name email")
      .populate("parentCategory", "name _id");

    if (!category) {
      return res.status(404).json({ message: "Category not found." });
    }

    return res.status(200).json({
      message: "Category fetched successfully.",
      data: category,
    });
  } catch (error) {
    console.error("Error fetching category by ID:", error.message);
    res.status(500).json({ message: "Internal Error", error: error.message });
  }
};

// POST Request
export const createCategory = async (req, res) => {
  try {
    const {
      name,
      description,
      parentCategory,
      seo,
      isActive,
      isFeatured,
      showInMenu,
      translations,
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Category name is required." });
    }

    // Generate slug from name
    const slug = slugify(name, { lower: true, strict: true });
    const existing = await Category.findOne({ slug });

    if (existing) {
      return res
        .status(400)
        .json({ message: "Category with this name already exists." });
    }

    let imageUrl = null;
    let iconUrl = null;

    // Upload image if provided
    if (req.files?.image?.[0]?.path) {
      const uploadImg = await uploadToCloudinary(
        req.files.image[0].path,
        "categories/images",
      );
      imageUrl = uploadImg.secure_url;
    }

    // Upload icon if provided
    if (req.files?.icon?.[0]?.path) {
      const uploadIcon = await uploadToCloudinary(
        req.files.icon[0].path,
        "categories/icons",
      );
      iconUrl = uploadIcon.secure_url;
    }

    // Create new category
    const category = await Category.create({
      name,
      slug,
      description,
      parentCategory:
        parentCategory && parentCategory !== "none" && parentCategory !== ""
          ? parentCategory
          : null,
      seo,
      isActive,
      isFeatured,
      showInMenu,
      image: imageUrl,
      icon: iconUrl,
      translations,
      createdBy: req.user._id,
    });

    // Link with parent if it exists and valid
    if (parentCategory && parentCategory !== "none") {
      const parent = await Category.findById(parentCategory);
      if (parent) {
        parent.subCategories.push(category._id);
        await parent.save();
      }
    }

    return res.status(201).json({
      message: "Category created successfully.",
      category,
    });
  } catch (error) {
    console.error("Error While Create Category:", error.message);

    res.status(500).json({ message: "Internal Error", error: error.message });
  }
};

// PUT Request
// NEW: Handles updating an existing category (for PUT requests)
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      parentCategory,
      seo,
      isActive,
      isFeatured,
      showInMenu,
      translations,
    } = req.body;

    // Find category
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found." });
    }

    let imageUrl = category.image;
    let iconUrl = category.icon;

    // ✅ Handle image removal
    if (req.body.removeImage === "true" && category.image) {
      try {
        const oldPublicId = category.image.split("/").pop().split(".")[0];
        await destroyFromCloudinary(`categories/images/${oldPublicId}`);
      } catch (err) {
        console.warn("Error removing old image:", err.message);
      }
      imageUrl = null;
    }

    // ✅ Handle image upload
    if (req.files?.image?.[0]?.path) {
      try {
        if (category.image) {
          const oldPublicId = category.image.split("/").pop().split(".")[0];
          await destroyFromCloudinary(`categories/images/${oldPublicId}`);
        }
        const uploadImg = await uploadToCloudinary(
          req.files.image[0].path,
          "categories/images",
        );
        imageUrl = uploadImg.secure_url;
      } catch (err) {
        console.warn("Error uploading image:", err.message);
      }
    }

    // ✅ Update all editable fields safely
    if (name) {
      category.name = name;
      category.slug = slugify(name, { lower: true, strict: true });
    }

    category.description = description ?? category.description;
    category.parentCategory =
      parentCategory && parentCategory !== "none" && parentCategory !== ""
        ? parentCategory
        : null;
    category.seo = seo ? JSON.parse(JSON.stringify(seo)) : category.seo;
    category.isActive = isActive ?? category.isActive;
    category.isFeatured = isFeatured ?? category.isFeatured;
    category.showInMenu = showInMenu ?? category.showInMenu;
    category.image = imageUrl;
    category.icon = iconUrl;
    category.translations = translations ?? category.translations;
    category.updatedBy = req.user._id;

    await category.save();

    return res.status(200).json({
      message: "Category updated successfully.",
      data: category,
    });
  } catch (error) {
    console.error("Error updating category:", error.message);
    return res.status(500).json({
      message: "Internal Error",
      error: error.message,
    });
  }
};

// NEW: Handles partial updates for a category (for PATCH requests)
// PATCH /api/v1/categories/:id
export const partiallyUpdateCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Category ID is required." });
    }

    // Find category
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found." });
    }

    // Handle toggles or partial updates dynamically
    const updateData = req.body;

    // Special handling for 'none' parentCategory
    if (
      updateData.parentCategory === "none" ||
      updateData.parentCategory === ""
    )
      updateData.parentCategory = null;

    // If name is updated, regenerate slug
    if (updateData.name) {
      category.slug = slugify(updateData.name, { lower: true, strict: true });
    }

    // Apply updates safely
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined && key !== "_id") {
        category[key] = value;
      }
    }

    // Track updater
    category.updatedBy = req.user._id;

    await category.save();

    return res.status(200).json({
      message: "Category updated successfully.",
      data: category,
    });
  } catch (error) {
    console.error("Error While Partially Update Category:", error.message);
    res.status(500).json({ message: "Internal Error", error: error.message });
  }
};

export const destroyCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Category ID is required." });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found." });
    }

    // Optional: Delete associated images from Cloudinary before deleting the document
    if (category.image) {
      try {
        const oldImagePublicId = category.image.split("/").pop().split(".")[0];
        await destroyFromCloudinary(`categories/images/${oldImagePublicId}`);
      } catch (e) {
        console.warn(
          "Could not delete category image from Cloudinary:",
          e.message,
        );
      }
    }
    if (category.icon) {
      try {
        const oldIconPublicId = category.icon.split("/").pop().split(".")[0];
        await destroyFromCloudinary(`categories/icons/${oldIconPublicId}`);
      } catch (e) {
        console.warn(
          "Could not delete category icon from Cloudinary:",
          e.message,
        );
      }
    }

    // Remove reference from parent category
    if (category.parentCategory) {
      const parent = await Category.findById(category.parentCategory);
      if (parent) {
        parent.subCategories = parent.subCategories.filter(
          (subId) => subId.toString() !== category._id.toString(),
        );
        await parent.save();
      }
    }

    // This is the key correction: use findByIdAndDelete
    await Category.findByIdAndDelete(category._id);

    return res
      .status(200)
      .json({ message: "Category deleted successfully.", id });
  } catch (error) {
    res.status(500).json({ message: "Internal Error", error: error.message });
  }
};
