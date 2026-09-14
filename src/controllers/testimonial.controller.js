import Testimonial from "../models/testimonial.model.js";
import {
  uploadToCloudinary,
  destroyFromCloudinary,
} from "../utils/cloudinaryService.js";
import Branch from "../models/branch.model.js";

/* ============================
   🟢 FRONTEND CONTROLLERS (Display Data)
============================ */

/**
 * Get testimonials for frontend by subdomain (branch-specific, active only)
 */
export const getFrontendTestimonials = async (req, res) => {
  try {
    const { subdomain } = req.query;
    const page = +req.query.page || 1;
    const limit = +req.query.limit || 10;
    const search = req.query.search?.trim() || "";

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

    const filter = { isActive: true, branchId: branch._id };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { designation: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Testimonial.countDocuments(filter);

    const testimonials = await Testimonial.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select(
        "name designation description avatar thumbnail rating video_link read_time createdAt",
      )
      .lean();

    res.status(200).json({
      success: true,
      message: "Testimonials fetched successfully.",
      data: testimonials,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/* ============================
   🔒 ADMIN CONTROLLERS (Manage Data)
============================ */

/**
 * Get all testimonials for admin (branch-specific, all statuses)
 */
export const getTestimonials = async (req, res) => {
  try {
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
        { name: { $regex: search, $options: "i" } },
        { designation: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Testimonial.countDocuments(filter);

    const testimonials = await Testimonial.find(filter)
      .populate("createdBy updatedBy", "name email")
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      message: "Testimonials fetched successfully.",
      data: testimonials,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching testimonials:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/**
 * Get single testimonial by ID
 */
export const getTestimonialById = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user?.branchId;

    if (!branchId) {
      return res.status(401).json({ message: "Branch ID not found. Please login again." });
    }

    const testimonial = await Testimonial.findById(id)
      .where({ branchId })
      .populate("createdBy updatedBy", "name email")
      .lean();

    if (!testimonial) {
      return res.status(404).json({ message: "Testimonial not found." });
    }

    return res.status(200).json({
      message: "Testimonial fetched successfully.",
      data: testimonial,
    });
  } catch (error) {
    console.error("Error fetching testimonial:", error.message);
    return res
      .status(500)
      .json({ message: "Internal Error", error: error.message });
  }
};

/* =====================================
   ➕ Create Testimonial
   ===================================== */
export const createTestimonial = async (req, res) => {
  try {
    const uploaded = { avatar: null, thumbnail: null };
    const branchId = req.user?.branchId;

    if (!branchId) {
      return res.status(401).json({ message: "Branch ID not found. Please login again." });
    }

    const { name, rating, isActive } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required." });
    }

    let avatarUrl = null;

    // Upload avatar (if provided)
    if (req.files?.avatar?.[0]?.path) {
      const upload = await uploadToCloudinary(
        req.files.avatar[0].path,
        "testimonials/avatar",
      );
      avatarUrl = upload.secure_url;
      uploaded.avatar = upload.public_id;
    }

    let thumbnailUrl = null;
    // Upload thumbnail (if provided)
    if (req.files?.thumbnail?.[0]?.path) {
      const upload = await uploadToCloudinary(
        req.files.thumbnail[0].path,
        "testimonials/thumbnail",
      );
      thumbnailUrl = upload.secure_url;
      uploaded.thumbnail = upload.public_id;
    }

    const testimonial = await Testimonial.create({
      name,
      designation: req.body.designation,
      description: req.body.description,
      avatar: avatarUrl,
      thumbnail: thumbnailUrl,
      rating,
      read_time: req.body.read_time ?? "2 min",
      video_link: req.body.video_link ?? null,
      isActive,
      branchId,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      message: "Testimonial created successfully.",
      data: testimonial,
    });
  } catch (error) {
    console.error("Error creating testimonial:", error.message);
    return res
      .status(500)
      .json({ message: "Internal Error", error: error.message });
  }
};

/* =====================================
   ✏️ Update Testimonial
   ===================================== */
export const updateTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user?.branchId;

    if (!branchId) {
      return res.status(401).json({ message: "Branch ID not found. Please login again." });
    }

    const { name, designation, description, video_link, rating, isActive } =
      req.body;

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      return res.status(404).json({ message: "Testimonial not found." });
    }

    // Verify testimonial belongs to user's branch
    if (testimonial.branchId.toString() !== branchId.toString()) {
      return res.status(403).json({ message: "Unauthorized. This testimonial belongs to a different branch." });
    }

    let avatarUrl = testimonial.avatar;

    // Handle avatar replacement
    if (req.files?.avatar?.[0]?.path) {
      if (testimonial.avatar) {
        try {
          const oldPublicId = testimonial.avatar.split("/").pop().split(".")[0];
          await destroyFromCloudinary(`testimonials/avatar/${oldPublicId}`);
        } catch (e) {
          console.warn("Error deleting old avatar:", e.message);
        }
      }
      const upload = await uploadToCloudinary(
        req.files.avatar[0].path,
        "testimonials/avatar",
      );
      avatarUrl = upload.secure_url;
    }

    let thumbnailUrl = testimonial.thumbnail;

    // Handle avatar replacement
    if (req.files?.thumbnail?.[0]?.path) {
      if (testimonial.thumbnail) {
        try {
          const oldPublicId = testimonial.thumbnail
            .split("/")
            .pop()
            .split(".")[0];
          await destroyFromCloudinary(`testimonials/thumbnail/${oldPublicId}`);
        } catch (e) {
          console.warn("Error deleting old thumbnail:", e.message);
        }
      }
      const upload = await uploadToCloudinary(
        req.files.thumbnail[0].path,
        "testimonials/thumbnail",
      );
      thumbnailUrl = upload.secure_url;
    }

    testimonial.name = name ?? testimonial.name;
    testimonial.designation = designation ?? testimonial.designation;
    testimonial.description = description ?? testimonial.description;
    testimonial.avatar = avatarUrl;
    testimonial.thumbnail = thumbnailUrl;
    testimonial.video_link = video_link ?? testimonial.video_link;
    testimonial.rating = rating ?? testimonial.rating;
    testimonial.isActive = isActive ?? testimonial.isActive;
    testimonial.updatedBy = req.user._id;

    await testimonial.save();

    return res.status(200).json({
      message: "Testimonial updated successfully.",
      data: testimonial,
    });
  } catch (error) {
    console.error("Error updating testimonial:", error.message);
    return res
      .status(500)
      .json({ message: "Internal Error", error: error.message });
  }
};

/* =====================================
   🔄 Partially Update Testimonial
   ===================================== */
export const partiallyUpdateTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user?.branchId;

    if (!branchId) {
      return res.status(401).json({ message: "Branch ID not found. Please login again." });
    }

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      return res.status(404).json({ message: "Testimonial not found." });
    }

    // Verify testimonial belongs to user's branch
    if (testimonial.branchId.toString() !== branchId.toString()) {
      return res.status(403).json({ message: "Unauthorized. This testimonial belongs to a different branch." });
    }

    // Apply partial updates
    Object.entries(req.body).forEach(([key, value]) => {
      if (value !== undefined && key !== "_id") testimonial[key] = value;
    });

    testimonial.updatedBy = req.user._id;
    await testimonial.save();

    return res.status(200).json({
      message: "Testimonial updated successfully.",
      data: testimonial,
    });
  } catch (error) {
    console.error("Error partially updating testimonial:", error.message);
    return res
      .status(500)
      .json({ message: "Internal Error", error: error.message });
  }
};

/* =====================================
   🗑️ Delete Testimonial
   ===================================== */
export const destroyTestimonialById = async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user?.branchId;

    if (!branchId) {
      return res.status(401).json({ message: "Branch ID not found. Please login again." });
    }

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      return res.status(404).json({ message: "Testimonial not found." });
    }

    // Verify testimonial belongs to user's branch
    if (testimonial.branchId.toString() !== branchId.toString()) {
      return res.status(403).json({ message: "Unauthorized. This testimonial belongs to a different branch." });
    }

    // Delete avatar from Cloudinary if exists
    if (testimonial.avatar) {
      try {
        const publicId = testimonial.avatar.split("/").pop().split(".")[0];
        await destroyFromCloudinary(`testimonials/avatar/${publicId}`);
      } catch (e) {
        console.warn("Error deleting avatar:", e.message);
      }
    }

    await Testimonial.findByIdAndDelete(id);

    return res
      .status(200)
      .json({ message: "Testimonial deleted successfully.", id });
  } catch (error) {
    console.error("Error deleting testimonial:", error.message);
    return res
      .status(500)
      .json({ message: "Internal Error", error: error.message });
  }
};
