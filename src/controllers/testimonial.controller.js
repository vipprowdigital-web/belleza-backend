import Testimonial from "../models/testimonial.model.js";
import {
  uploadToCloudinary,
  destroyFromCloudinary,
} from "../utils/cloudinaryService.js";

/* ============================
   🟢 PUBLIC CONTROLLERS
============================ */
export const getAllActiveTestimonials = async (req, res) => {
  try {
    const page = +req.query.page || 1;
    const limit = +req.query.limit || 10;
    const search = req.query.search?.trim() || "";

    const filter = { isActive: true };

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
        "name designation short_description description shortDescription avatar thumbnail rating video_link read_time createdAt",
      )
      .lean();

    res.status(200).json({
      success: true,
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

/* =====================================
   🔍 Get Testimonial by ID
   ===================================== */
export const getActiveTestimonialById = async (req, res) => {
  try {
    const { id } = req.params;
    const testimonial = await Testimonial.findById(id)
      .where({ isActive: true })
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
   🔒 Get All Testimonials (Admin)
   ===================================== */
export const getTestimonials = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const skip = (page - 1) * limit;

    const filter = search
      ? {
          $or: [
            { name: new RegExp(search, "i") },
            { designation: new RegExp(search, "i") },
            { description: new RegExp(search, "i") },
          ],
        }
      : {};

    const total = await Testimonial.countDocuments(filter);

    const testimonials = await Testimonial.find(filter)
      .populate("createdBy updatedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json({
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
    return res
      .status(500)
      .json({ message: "Internal Error", error: error.message });
  }
};

/* =====================================
   🔍 Get Testimonial by ID
   ===================================== */

export const getTestimonialById = async (req, res) => {
  try {
    const { id } = req.params;
    const testimonial = await Testimonial.findById(id)
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
    const { name, designation, description, video_link, rating, isActive } =
      req.body;

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      return res.status(404).json({ message: "Testimonial not found." });
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

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      return res.status(404).json({ message: "Testimonial not found." });
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
    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      return res.status(404).json({ message: "Testimonial not found." });
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
