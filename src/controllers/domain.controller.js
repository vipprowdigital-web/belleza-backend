import slugify from "slugify";
import {
  destroyFromCloudinary,
  uploadToCloudinary,
} from "../utils/cloudinaryService.js";
import Domain from "../models/services/domain.model.js";

export const getPublicDomains = async (req, res) => {
  try {
    // Fetch domains name
    const domains = await Domain.find()
      .select("name")
      .populate("parentDomain", "name _id")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Domains Name fetched successfully.",
      data: domains,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Error", error: error.message });
  }
};

export const getDomains = async (req, res) => {
  try {
    // Extract query params (with defaults)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    // Calculate how many to skip
    const skip = (page - 1) * limit;

    // Fetch total count for pagination
    const total = await Domain.countDocuments();

    // Fetch paginated domains
    const domains = await Domain.find()
      .populate("createdBy", "name email")
      .populate("parentDomain", "name _id") // 👈 REQUIRED
      .sort({ createdAt: -1 }) // latest first
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      message: "Domains fetched successfully.",
      data: domains,
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
export const getDomainById = async (req, res) => {
  try {
    const { id } = req.params;

    // Find domain by ID and populate references if needed
    const domain = await Domain.findById(id)
      .populate("createdBy", "name email")
      .populate("parentDomain", "name _id");

    if (!domain) {
      return res.status(404).json({ message: "Domain not found." });
    }

    return res.status(200).json({
      message: "Domain fetched successfully.",
      data: domain,
    });
  } catch (error) {
    console.error("Error fetching domain by ID:", error.message);
    res.status(500).json({ message: "Internal Error", error: error.message });
  }
};

// POST Request
export const createDomain = async (req, res) => {
  try {
    const {
      name,
      description,
      parentDomain,
      seo,
      isActive,
      isFeatured,
      showInMenu,
      translations,
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Domain name is required." });
    }

    // Generate slug from name
    const slug = slugify(name, { lower: true, strict: true });
    const existing = await Domain.findOne({ slug });

    if (existing) {
      return res
        .status(400)
        .json({ message: "Domain with this name already exists." });
    }

    let imageUrl = null;
    let iconUrl = null;

    // Upload image if provided
    if (req.files?.image?.[0]?.path) {
      const uploadImg = await uploadToCloudinary(
        req.files.image[0].path,
        "domains/images",
      );
      imageUrl = uploadImg.secure_url;
    }

    // Upload icon if provided
    if (req.files?.icon?.[0]?.path) {
      const uploadIcon = await uploadToCloudinary(
        req.files.icon[0].path,
        "domains/icons",
      );
      iconUrl = uploadIcon.secure_url;
    }

    // Create new domain
    const domain = await Domain.create({
      name,
      slug,
      description,
      parentDomain:
        parentDomain && parentDomain !== "none" && parentDomain !== ""
          ? parentDomain
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
    if (parentDomain && parentDomain !== "none") {
      const parent = await Domain.findById(parentDomain);
      if (parent) {
        parent.subDomains.push(domain._id);
        await parent.save();
      }
    }

    return res.status(201).json({
      message: "Domain created successfully.",
      domain,
    });
  } catch (error) {
    console.error("Error While Create Domain:", error.message);

    res.status(500).json({ message: "Internal Error", error: error.message });
  }
};

// PUT Request
// NEW: Handles updating an existing domain (for PUT requests)
export const updateDomain = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      parentDomain,
      seo,
      isActive,
      isFeatured,
      showInMenu,
      translations,
    } = req.body;

    // Find domain
    const domain = await Domain.findById(id);
    if (!domain) {
      return res.status(404).json({ message: "Domain not found." });
    }

    let imageUrl = domain.image;
    let iconUrl = domain.icon;

    // ✅ Handle image removal
    if (req.body.removeImage === "true" && domain.image) {
      try {
        const oldPublicId = domain.image.split("/").pop().split(".")[0];
        await destroyFromCloudinary(`domains/images/${oldPublicId}`);
      } catch (err) {
        console.warn("Error removing old image:", err.message);
      }
      imageUrl = null;
    }

    // ✅ Handle image upload
    if (req.files?.image?.[0]?.path) {
      try {
        if (domain.image) {
          const oldPublicId = domain.image.split("/").pop().split(".")[0];
          await destroyFromCloudinary(`domains/images/${oldPublicId}`);
        }
        const uploadImg = await uploadToCloudinary(
          req.files.image[0].path,
          "domains/images",
        );
        imageUrl = uploadImg.secure_url;
      } catch (err) {
        console.warn("Error uploading image:", err.message);
      }
    }

    // ✅ Update all editable fields safely
    if (name) {
      domain.name = name;
      domain.slug = slugify(name, { lower: true, strict: true });
    }

    domain.description = description ?? domain.description;
    domain.parentDomain =
      parentDomain && parentDomain !== "none" && parentDomain !== ""
        ? parentDomain
        : null;
    domain.seo = seo ? JSON.parse(JSON.stringify(seo)) : domain.seo;
    domain.isActive = isActive ?? domain.isActive;
    domain.isFeatured = isFeatured ?? domain.isFeatured;
    domain.showInMenu = showInMenu ?? domain.showInMenu;
    domain.image = imageUrl;
    domain.icon = iconUrl;
    domain.translations = translations ?? domain.translations;
    domain.updatedBy = req.user._id;

    await domain.save();

    return res.status(200).json({
      message: "Domain updated successfully.",
      data: domain,
    });
  } catch (error) {
    console.error("Error updating domain:", error.message);
    return res.status(500).json({
      message: "Internal Error",
      error: error.message,
    });
  }
};

// NEW: Handles partial updates for a domain (for PATCH requests)
// PATCH /api/v1/domains/:id
export const partiallyUpdateDomain = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Domain ID is required." });
    }

    // Find domain
    const domain = await Domain.findById(id);
    if (!domain) {
      return res.status(404).json({ message: "Domain not found." });
    }

    // Handle toggles or partial updates dynamically
    const updateData = req.body;

    // Special handling for 'none' parentDomain
    if (updateData.parentDomain === "none" || updateData.parentDomain === "")
      updateData.parentDomain = null;

    // If name is updated, regenerate slug
    if (updateData.name) {
      domain.slug = slugify(updateData.name, { lower: true, strict: true });
    }

    // Apply updates safely
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined && key !== "_id") {
        domain[key] = value;
      }
    }

    // Track updater
    domain.updatedBy = req.user._id;

    await domain.save();

    return res.status(200).json({
      message: "Domain updated successfully.",
      data: domain,
    });
  } catch (error) {
    console.error("Error While Partially Update Domain:", error.message);
    res.status(500).json({ message: "Internal Error", error: error.message });
  }
};

export const destroyDomainById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Domain ID is required." });
    }

    const domain = await Domain.findById(id);
    if (!domain) {
      return res.status(404).json({ message: "Domain not found." });
    }

    // Optional: Delete associated images from Cloudinary before deleting the document
    if (domain.image) {
      try {
        const oldImagePublicId = domain.image.split("/").pop().split(".")[0];
        await destroyFromCloudinary(`domains/images/${oldImagePublicId}`);
      } catch (e) {
        console.warn(
          "Could not delete domain image from Cloudinary:",
          e.message,
        );
      }
    }
    if (domain.icon) {
      try {
        const oldIconPublicId = domain.icon.split("/").pop().split(".")[0];
        await destroyFromCloudinary(`domains/icons/${oldIconPublicId}`);
      } catch (e) {
        console.warn(
          "Could not delete domain icon from Cloudinary:",
          e.message,
        );
      }
    }

    // Remove reference from parent domain
    if (domain.parentDomain) {
      const parent = await Domain.findById(domain.parentDomain);
      if (parent) {
        parent.subDomains = parent.subDomains.filter(
          (subId) => subId.toString() !== domain._id.toString(),
        );
        await parent.save();
      }
    }

    // This is the key correction: use findByIdAndDelete
    await Domain.findByIdAndDelete(domain._id);

    return res
      .status(200)
      .json({ message: "Domain deleted successfully.", id });
  } catch (error) {
    res.status(500).json({ message: "Internal Error", error: error.message });
  }
};
