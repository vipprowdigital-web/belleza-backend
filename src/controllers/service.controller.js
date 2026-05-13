import slugify from "slugify";
import Service from "../models/services/service.model.js";
import {
  destroyFromCloudinary,
  uploadToCloudinary,
} from "../utils/cloudinaryService.js";
import mongoose from "mongoose";
import Domain from "../models/services/domain.model.js";

/* ============================
   🟢 PUBLIC CONTROLLERS
============================ */

export const getAllActiveServices = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const sortBy = req.query.sortBy || "createdAt"; // Added
    const sortOrder = req.query.sortOrder || "desc"; // Added: "asc" or "desc"

    const search = req.query.search?.trim() || "";
    const domains = req.query.domains?.split(",") || [];

    // ------------------------------
    // Base Match Query
    // ------------------------------
    const matchQuery = { isActive: true };

    // 🏷 Domain FILTER
    if (domains.length > 0 && domains[0] !== "") {
      matchQuery.domain = {
        $in: domains.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    // 🔍 SEARCH by title, description, and domain name
    const searchQuery = search
      ? {
          $or: [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
            { "domain.name": { $regex: search, $options: "i" } },
          ],
        }
      : {};

    // ------------------------------
    // DYNAMIC SORT
    // ------------------------------
    const sortDirection = sortOrder === "asc" ? 1 : -1;

    // ------------------------------
    // AGGREGATION PIPELINE
    // ------------------------------
    const pipeline = [
      { $match: matchQuery },

      // Join domain data
      {
        $lookup: {
          from: "domains",
          localField: "domain",
          foreignField: "_id",
          as: "domain",
        },
      },

      { $unwind: { path: "$domain", preserveNullAndEmptyArrays: true } },

      { $match: searchQuery },

      { $sort: { [sortBy]: sortDirection } }, // ✅ Dynamic sort

      { $skip: (page - 1) * limit },
      { $limit: limit },
    ];

    // Count pipeline
    const countPipeline = [
      { $match: matchQuery },
      {
        $lookup: {
          from: "domains",
          localField: "domain",
          foreignField: "_id",
          as: "domain",
        },
      },
      { $unwind: { path: "$domain", preserveNullAndEmptyArrays: true } },
      { $match: searchQuery },
      { $count: "total" },
    ];

    const [services, countResult] = await Promise.all([
      Service.aggregate(pipeline),
      Service.aggregate(countPipeline),
    ]);

    const total = countResult[0]?.total || 0;

    res.status(200).json({
      success: true,
      data: services,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("❌ Error fetching services:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * 🟢 Get Service by ID
 */

export const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id)
      .populate("domain", "name slug")
      .lean();

    if (!service)
      return res.status(404).json({ message: "Service not found." });

    res.status(200).json({
      message: "Service fetched successfully.",
      data: service,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Error", error: error.message });
  }
};

// Get All Active Services Names

export const getAllActiveServicesName = async (req, res) => {
  try {
    const services_names = await Service.find({ isActive: true })
      .select("title")
      .lean();

    if (services_names.length === 0) {
      return res.status(404).json({ message: "Services not found." });
    }

    res.status(200).json({
      message: "Services Names fetched successfully.",
      data: services_names,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message ?? "Internal Error",
      error: error.message,
    });
  }
};

/* ============================
   🔒 ADMIN — GET ALL Services (with filters)
============================ */
export const getAllServices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      sortOrder = "desc",
      filter = "all",
    } = req.query;

    let filterQuery = {};

    // ⭐ Status filters
    if (filter === "active") filterQuery.isActive = true;
    if (filter === "inactive") filterQuery.isActive = false;

    // ⭐ Search filter
    const searchQuery = search
      ? {
          $or: [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
            { "seo.metaKeywords": { $regex: search, $options: "i" } },
          ],
        }
      : {};

    // ⭐ Final combined query
    const finalQuery = {
      ...filterQuery,
      ...searchQuery,
    };

    const total = await Service.countDocuments(finalQuery);

    const services = await Service.find(finalQuery)
      .populate("domain", "name slug")
      .populate("createdBy updatedBy", "name email")
      .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: services,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: err.message ?? "Internal Server Error",
    });
  }
};

/**
 * 🟢 Create Service
 */
export const createService = async (req, res) => {
  try {
    const { title, domain, subHeading, description, isActive } = req.body;

    if (!title || !description || !domain) {
      return res.status(400).json({
        message: "Title, description and domain are required.",
      });
    }

    // Validate Domain ObjectId
    if (!mongoose.Types.ObjectId.isValid(domain)) {
      return res.status(400).json({
        message: "Invalid domain ID.",
      });
    }

    // Check if Domain exists
    const domainExists = await Domain.findById(domain);
    if (!domainExists) {
      return res.status(404).json({
        message: "Selected domain not found.",
      });
    }

    // Prevent duplicate title inside same domain (better approach)
    const existing = await Service.findOne({ title, domain });
    if (existing) {
      return res.status(400).json({
        message: "Service title already exists in this domain.",
      });
    }

    let thumbnailUrl = null;

    if (req.files?.thumbnail?.[0]?.path) {
      const uploadThumb = await uploadToCloudinary(
        req.files.thumbnail[0].path,
        "service/thumbnail",
      );
      thumbnailUrl = uploadThumb.secure_url;
    }

    const service = await Service.create({
      title,
      domain,
      subHeading,
      description,
      thumbnail: thumbnailUrl,
      isActive,
      createdBy: req.user?._id,
    });

    res.status(201).json({
      message: "Service created successfully.",
      data: service,
    });
  } catch (error) {
    console.error("Error creating service:", error.message);
    res.status(500).json({ message: "Internal Error", error: error.message });
  }
};

/**
 * 🟢 Update Service (PUT)
 */
export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, domain, subHeading, description, isActive } = req.body;

    const service = await Service.findById(id);
    if (!service)
      return res.status(404).json({ message: "Service not found." });

    let thumbnailUrl = service.thumbnail;

    // Handle new thumbnail
    if (req.files?.thumbnail?.[0]?.path) {
      if (service.thumbnail) {
        try {
          const oldPublicId = service.thumbnail.split("/").pop().split(".")[0];
          await destroyFromCloudinary(`service/thumbnail/${oldPublicId}`);
        } catch (err) {
          console.warn("Failed to delete old thumbnail:", err.message);
        }
      }

      const uploadThumb = await uploadToCloudinary(
        req.files.thumbnail[0].path,
        "service/thumbnail",
      );
      thumbnailUrl = uploadThumb.secure_url;
    }

    // Update fields
    service.title = title ?? service.title;
    if (domain !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(domain)) {
        return res.status(400).json({ message: "Invalid domain ID." });
      }

      const domainExists = await Domain.findById(domain);
      if (!domainExists) {
        return res.status(404).json({ message: "Domain not found." });
      }

      service.domain = domain;
    }
    service.subHeading = subHeading ?? service.subHeading;
    service.description = description ?? service.description;
    service.isActive = isActive ?? service.isActive;
    service.thumbnail = thumbnailUrl;
    service.updatedBy = req.user?._id;

    await service.save();

    res
      .status(200)
      .json({ message: "Service updated successfully.", data: service });
  } catch (error) {
    res.status(500).json({ message: "Internal Error", error: error.message });
  }
};

/**
 * 🟢 Partial Update (PATCH)
 */
export const partiallyUpdateService = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const service = await Service.findById(id);
    if (!service)
      return res.status(404).json({ message: "Service not found." });

    // Dynamically apply updates
    for (const [key, value] of Object.entries(updates)) {
      if (key !== "_id" && value !== undefined) {
        service[key] = value;
      }
    }
    if (updates.domain !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(updates.domain)) {
        return res.status(400).json({ message: "Invalid domain ID." });
      }

      const domainExists = await Domain.findById(updates.domain);
      if (!domainExists) {
        return res.status(404).json({ message: "Domain not found." });
      }
    }

    service.updatedBy = req.user?._id;
    await service.save();

    res.status(200).json({
      message: "Service updated successfully.",
      data: service,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Error", error: error.message });
  }
};

/**
 * 🟢 Delete Service (with Cloudinary Cleanup)
 */
export const destroyServiceById = async (req, res) => {
  try {
    const { id } = req.params;

    // 🧩 Find the service
    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({ message: "Service not found." });
    }

    // 🧹 1️⃣ Delete the thumbnail image from Cloudinary (if exists)
    if (service.thumbnail) {
      try {
        const thumbPublicId = service.thumbnail.split("/").pop().split(".")[0];
        await destroyFromCloudinary(`service/thumbnail/${thumbPublicId}`);
      } catch (err) {
        console.warn("⚠️ Failed to delete thumbnail:", err.message);
      }
    }

    // 🧹 2️⃣ Delete embedded images from description (Cloudinary editor-images)
    if (service.description) {
      const regex = /https:\/\/res\.cloudinary\.com\/[^"]+\/upload\/[^"]+/g;
      const imageUrls = service.description.match(regex) || [];

      for (const url of imageUrls) {
        try {
          // Extract Cloudinary public_id (everything after `/upload/`)
          const parts = url.split("/");
          const uploadIndex = parts.indexOf("upload");
          if (uploadIndex !== -1) {
            const publicId = parts
              .slice(uploadIndex + 1)
              .join("/")
              .split(".")[0];
            if (publicId) {
              await destroyFromCloudinary(publicId);
              console.log(`🗑️ Deleted embedded image: ${publicId}`);
            }
          }
        } catch (err) {
          console.warn("⚠️ Failed to delete embedded image:", err.message);
        }
      }
    }

    // 🗑️ 3️⃣ Delete the service record itself
    await Service.findByIdAndDelete(id);

    res.status(200).json({
      message: "Service and all associated images deleted successfully.",
    });
  } catch (error) {
    console.error("❌ Error deleting service:", error.message);
    res.status(500).json({
      message: "Internal Error",
      error: error.message,
    });
  }
};
