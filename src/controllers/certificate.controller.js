import slugify from "slugify";
import {
  uploadToCloudinary,
  destroyFromCloudinary,
} from "../utils/cloudinaryService.js";
import Certification from "../models/certification.model.js";
import { getOptimizedImage } from "../utils/cloudinaryUrl.js";

/* ================================
   🟢 PUBLIC CONTROLLERS
   ================================ */

/**
 * @desc Get all active certificates (Public)
 * @route GET /api/v1/certificate/active
 */
export const getAllActiveCertificate = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search?.trim() || "";
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const skip = (page - 1) * limit;

    const filter = { isActive: true };
    if (search) filter.title = { $regex: search, $options: "i" };

    const total = await Certification.countDocuments(filter);

    const certificates = await Certification.find(filter)
      .populate("category", "name slug")
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    certificates.forEach((c) => {
      if (c.image?.public_id) {
        c.image.optimized = getOptimizedImage(
          c.image.public_id,
          800 // slider/card size
        );
      }
    });

    return res.status(200).json({
      success: true,
      message: "Active certificates fetched successfully.",
      data: certificates,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching active certificates:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * @desc Get single certificate by ID
 * @route GET /api/v1/certificate/:id
 */
export const getCertificateById = async (req, res) => {
  try {
    const certificate = await Certification.findById(req.params.id)
      .populate("category", "name slug")
      .lean();

    if (!certificate)
      return res.status(404).json({ message: "Certificate not found." });

    // 🔥 NORMALIZE IMAGE
    if (typeof certificate.image === "string") {
      certificate.image = {
        url: certificate.image,
        optimized: certificate.image,
      };
    }

    if (certificate.image?.public_id) {
      certificate.image.optimized = getOptimizedImage(
        certificate.image.public_id,
        1200
      );
    }

    return res.status(200).json({
      success: true,
      message: "Certificate fetched successfully.",
      data: certificate,
    });
  } catch (error) {
    console.error("Error fetching certificate by ID:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/* ================================
   🔒 ADMIN CONTROLLERS
   ================================ */

/**
 * @desc Get all certificates (Admin)
 * @route GET /api/v1/certificate
 */
export const getAllCertificate = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search?.trim() || "";
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
    const skip = (page - 1) * limit;

    const filter = {};
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Certification.countDocuments(filter);

    const certificates = await Certification.find(filter)
      .populate("category", "name slug")
      .populate("createdBy updatedBy", "name email")
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    certificates.forEach((c) => {
      if (c.image?.public_id) {
        c.image.optimized = getOptimizedImage(c.image.public_id, 200); // table thumb
      }
    });

    return res.status(200).json({
      success: true,
      message: "Certificates fetched successfully.",
      data: certificates,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching certificates:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * @desc Create new certificate
 * @route POST /api/v1/certificate
 */
export const createCertificate = async (req, res) => {
  try {
    const { title, category, isActive = true } = req.body;

    if (!title?.trim())
      return res.status(400).json({ message: "Title is required." });

    const slug = slugify(title, { lower: true, strict: true });

    const exists = await Certification.findOne({ slug });
    if (exists)
      return res
        .status(400)
        .json({ message: "Certificate already exists with this title." });

    let imageUrl = null;
    if (req.files?.certificateMedia?.[0]?.path) {
      const upload = await uploadToCloudinary(
        req.files.certificateMedia[0].path,
        "certificate/media"
      );

      imageUrl = {
        url: upload.secure_url,
        public_id: upload.public_id,
      };
    }

    const certificate = await Certification.create({
      title: title.trim(),
      slug,
      category,
      image: imageUrl,
      isActive,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Certificate created successfully.",
      data: certificate,
    });
  } catch (error) {
    console.error("Error creating certificate:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * @desc Update certificate
 * @route PUT /api/v1/certificate/:id
 */
export const updateCertificate = async (req, res) => {
  try {
    const certificate = await Certification.findById(req.params.id);

    if (!certificate)
      return res.status(404).json({ message: "Certificate not found." });

    if (req.files?.certificateMedia?.[0]?.path) {
      if (certificate.image?.public_id) {
        await destroyFromCloudinary(certificate.image.public_id);
      }

      const upload = await uploadToCloudinary(
        req.files.certificateMedia[0].path,
        "certificate/media"
      );
      certificate.image = {
        url: upload.secure_url,
        public_id: upload.public_id,
      };
    }

    const { title, category, isActive } = req.body;

    if (title) {
      certificate.title = title.trim();
      certificate.slug = slugify(title, { lower: true, strict: true });
    }

    if (category) certificate.category = category;
    if (typeof isActive !== "undefined") certificate.isActive = isActive;

    certificate.updatedBy = req.user._id;
    await certificate.save();

    return res.status(200).json({
      success: true,
      message: "Certificate updated successfully.",
      data: certificate,
    });
  } catch (error) {
    console.error("Error updating certificate:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * @desc PATCH update
 */
export const partiallyUpdateCertificate = async (req, res) => {
  try {
    const certificate = await Certification.findById(req.params.id);

    if (!certificate)
      return res.status(404).json({ message: "Certificate not found." });

    Object.entries(req.body).forEach(([key, value]) => {
      if (key !== "_id" && value !== undefined) certificate[key] = value;
    });

    certificate.updatedBy = req.user._id;
    await certificate.save();

    return res.status(200).json({
      success: true,
      message: "Certificate updated successfully.",
      data: certificate,
    });
  } catch (error) {
    console.error("Error patch updating:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * @desc Delete certificate
 * @route DELETE /api/v1/certificate/:id
 */
export const destroyCertificateById = async (req, res) => {
  try {
    const certificate = await Certification.findById(req.params.id);

    if (!certificate)
      return res.status(404).json({ message: "Certificate not found." });

    if (certificate.image?.public_id) {
      await destroyFromCloudinary(certificate.image.public_id);
    }

    await Certification.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Certificate deleted successfully.",
      id: req.params.id,
    });
  } catch (error) {
    console.error("Error deleting certificate:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
