import slugify from "slugify";
import Gallery from "../models/gallery.model.js";
import {
  uploadToCloudinary,
  destroyFromCloudinary,
} from "../utils/cloudinaryService.js";
import Branch from "../models/branch.model.js";

/* ================================
   🟢 FRONTEND CONTROLLERS (Display Data)
   ================================ */

/**
 * Get galleries for frontend by subdomain (branch-specific, active only)
 */
export const getFrontendGalleries = async (req, res) => {
  try {
    const { subdomain } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search?.trim() || "";
    const category = req.query.category;
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    // Validate subdomain
    if (!subdomain) {
      return res.status(400).json({
        success: false,
        message: "Subdomain is required as query parameter.",
      });
    }

    // Find branch by subdomain
    const branch = await Branch.findOne({ subdomain: subdomain.toLowerCase() }).lean();

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found.",
      });
    }

    const skip = (page - 1) * limit;

    // Build filter for search + only active galleries + branchId
    const filter = { isActive: true, branchId: branch._id };
    if (search) {
      filter.title = { $regex: search, $options: "i" };
    }

    if (category) {
      filter.category = category;
    }

    // Count total
    const total = await Gallery.countDocuments(filter);

    // Fetch records
    const galleries = await Gallery.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      message: "Active galleries fetched successfully.",
      data: galleries,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching galleries for frontend:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/* ================================
   🔒 ADMIN CONTROLLERS (Manage Data)
   ================================ */



/**
 * @desc Get single gallery by ID (Public)
 * @route GET /api/v1/gallery/:id
 */
export const getGalleryById = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user?.branchId;

    if (!branchId) {
      return res.status(401).json({ message: "Branch ID not found. Please login again." });
    }

    const gallery = await Gallery.findById(id)
      .where({ branchId })
      .lean();

    if (!gallery)
      return res.status(404).json({ message: "Gallery not found." });

    res.status(200).json({
      success: true,
      message: "Gallery fetched successfully.",
      data: gallery,
    });
  } catch (error) {
    console.error("Error fetching gallery by ID:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/* ================================
   🔒 ADMIN CONTROLLERS
   ================================ */

/**
 * @desc Get all galleries (Admin)
 * @route GET /api/v1/gallery?page=1&limit=10&search=&sortBy=createdAt&sortOrder=desc
 */
export const getAllGallery = async (req, res) => {
  try {
    // Extract query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search?.trim() || "";
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
    const skip = (page - 1) * limit;
    const branchId = req.user?.branchId;

    if (!branchId) {
      return res.status(401).json({ message: "Branch ID not found. Please login again." });
    }

    // Build search filter with branchId
    const filter = { branchId };
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Gallery.countDocuments(filter);

    const galleries = await Gallery.find(filter)
      .populate("category", "name slug")
      .populate("createdBy updatedBy", "name email")
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      message: "Galleries fetched successfully.",
      data: galleries,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching galleries:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/**
 * @desc Create new gallery
 * @route POST /api/v1/gallery
 */
export const createGallery = async (req, res) => {
  try {
    const { title, category, isActive = true } = req.body;
    const branchId = req.user?.branchId;

    if (!branchId) {
      return res.status(401).json({ message: "Branch ID not found. Please login again." });
    }

    if (!title?.trim())
      return res.status(400).json({ message: "Title is required." });

    const slug = slugify(title, { lower: true, strict: true });
    const exists = await Gallery.findOne({ slug, branchId });
    if (exists)
      return res
        .status(400)
        .json({ message: "Gallery already exists with this title in your branch." });

    let galleryMediaUrl = null;
    if (req.files?.galleryMedia?.[0]?.path) {
      const upload = await uploadToCloudinary(
        req.files.galleryMedia[0].path,
        "gallery/media"
      );
      galleryMediaUrl = upload.secure_url;
    }

    const gallery = await Gallery.create({
      title: title.trim(),
      slug,
      category,
      image: galleryMediaUrl,
      isActive,
      branchId,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Gallery created successfully.",
      data: gallery,
    });
  } catch (error) {
    console.error("Error creating gallery:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/**
 * @desc Update gallery (PUT)
 * @route PUT /api/v1/gallery/:id
 */
export const updateGallery = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user?.branchId;

    if (!branchId) {
      return res.status(401).json({ message: "Branch ID not found. Please login again." });
    }

    const { title, category, isActive } = req.body;

    const gallery = await Gallery.findById(id);
    if (!gallery)
      return res.status(404).json({ message: "Gallery not found." });

    // Verify gallery belongs to user's branch
    if (gallery.branchId.toString() !== branchId.toString()) {
      return res.status(403).json({ message: "Unauthorized. This gallery belongs to a different branch." });
    }

    // Upload new image if provided
    if (req.files?.galleryMedia?.[0]?.path) {
      if (gallery.image) {
        try {
          const oldPublicId = gallery.image.split("/").pop().split(".")[0];
          await destroyFromCloudinary(`gallery/media/${oldPublicId}`);
        } catch (err) {
          console.warn("Old image cleanup failed:", err.message);
        }
      }

      const upload = await uploadToCloudinary(
        req.files.galleryMedia[0].path,
        "gallery/media"
      );
      gallery.image = upload.secure_url;
    }

    if (title) {
      gallery.title = title.trim();
      gallery.slug = slugify(title, { lower: true, strict: true });
    }

    gallery.category = category || gallery.category;
    gallery.isActive =
      typeof isActive !== "undefined" ? isActive : gallery.isActive;
    gallery.updatedBy = req.user._id;

    await gallery.save();

    res.status(200).json({
      success: true,
      message: "Gallery updated successfully.",
      data: gallery,
    });
  } catch (error) {
    console.error("Error updating gallery:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/**
 * @desc Partially update gallery (PATCH)
 * @route PATCH /api/v1/gallery/:id
 */
export const partiallyUpdateGallery = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user?.branchId;

    if (!branchId) {
      return res.status(401).json({ message: "Branch ID not found. Please login again." });
    }

    const updates = req.body;

    const gallery = await Gallery.findById(id);
    if (!gallery)
      return res.status(404).json({ message: "Gallery not found." });

    // Verify gallery belongs to user's branch
    if (gallery.branchId.toString() !== branchId.toString()) {
      return res.status(403).json({ message: "Unauthorized. This gallery belongs to a different branch." });
    }

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== "_id" && value !== undefined) gallery[key] = value;
    });

    gallery.updatedBy = req.user._id;
    await gallery.save();

    res.status(200).json({
      success: true,
      message: "Gallery updated successfully.",
      data: gallery,
    });
  } catch (error) {
    console.error("Error partially updating gallery:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/**
 * @desc Delete gallery by ID
 * @route DELETE /api/v1/gallery/:id
 */
export const destroyGalleryById = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user?.branchId;

    if (!branchId) {
      return res.status(401).json({ message: "Branch ID not found. Please login again." });
    }

    const gallery = await Gallery.findById(id);
    if (!gallery)
      return res.status(404).json({ message: "Gallery not found." });

    // Verify gallery belongs to user's branch
    if (gallery.branchId.toString() !== branchId.toString()) {
      return res.status(403).json({ message: "Unauthorized. This gallery belongs to a different branch." });
    }

    if (gallery.image) {
      try {
        const oldPublicId = gallery.image.split("/").pop().split(".")[0];
        await destroyFromCloudinary(`gallery/media/${oldPublicId}`);
      } catch (err) {
        console.warn("Cloudinary cleanup failed:", err.message);
      }
    }

    await Gallery.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Gallery deleted successfully.",
      id,
    });
  } catch (error) {
    console.error("Error deleting gallery:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
