// // src/controllers/userCertificate.controller.js

import UserCertificate from "../models/userCertificate.model.js";
import { UAParser } from "ua-parser-js";
import { destroyFromCloudinary, uploadToCloudinary } from "../utils/cloudinaryService.js";

/* ======================================================
   🟢 PUBLIC: Verify & Download Certificate
====================================================== */
export const verifyUserCertificate = async (req, res) => {
  try {
    const { phone, email } = req.body;

    if (!phone || !email) {
      return res.status(400).json({
        success: false,
        message: "Phone and Email are required",
      });
    }

    const record = await UserCertificate.findOne({ phone, email });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "No certificate found for this user",
      });
    }

    /* 🔍 Device Info */
    const parser = new UAParser(req.headers["user-agent"]);
    const ua = parser.getResult();

    record.downloads.push({
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      device: ua.device.type || "desktop",
      os: ua.os.name,
      browser: ua.browser.name,
    });

    record.isVerified = true;
    await record.save();

    return res.json({
      success: true,
      message: "Certificate verified",
      data: {
        pdfUrl: record.pdfUrl,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ======================================================
   🔵 ADMIN: Create User Certificate (Upload PDF)
====================================================== */
export const createUserCertificate = async (req, res) => {
  try {
    const { name, phone, email } = req.body;

    if (!name || !phone || !email || !req.file) {
      return res.status(400).json({
        success: false,
        message: "Name, phone, email and PDF are required",
      });
    }

    // ⬆ Upload PDF to Cloudinary
    const uploadResult = await uploadToCloudinary(
      req.file.path,
      "usersCertificates"
    );

    const record = await UserCertificate.create({
      name,
      phone,
      email,
      pdfUrl: uploadResult.secure_url,
      pdfPublicId: uploadResult.public_id,
    });

    return res.status(201).json({
      success: true,
      message: "Certificate uploaded successfully",
      data: record,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ======================================================
   🔵 ADMIN: Get all user certificates (Paginated)
====================================================== */
export const getAllUserCertificates = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await UserCertificate.countDocuments();

    const records = await UserCertificate.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      data: records,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ======================================================
   🔵 ADMIN: Get single certificate (with history)
====================================================== */
export const getUserCertificateById = async (req, res) => {
  try {
    const record = await UserCertificate.findById(req.params.id).lean();

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Certificate record not found",
      });
    }

    return res.json({
      success: true,
      data: record,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ======================================================
   🔵 ADMIN: Update user certificate
====================================================== */ 
export const updateUserCertificate =
  async (req, res) => {
    try {
      const record = await UserCertificate.findById(req.params.id);

      if (!record) {
        return res.status(404).json({
          success: false,
          message: "Certificate record not found",
        });
      }

      // If new PDF uploaded
      if (req.file) {
        // ❌ delete old PDF
        if (record.pdfPublicId) {
          await destroyFromCloudinary(record.pdfPublicId);
        }

        // ⬆ upload new PDF
        const uploadResult = await uploadToCloudinary(
          req.file.path,
          "usersCertificates"
        );

        record.pdfUrl = uploadResult.secure_url;
        record.pdfPublicId = uploadResult.public_id;
      }

      // Update other fields
      record.name = req.body.name ?? record.name;
      record.phone = req.body.phone ?? record.phone;
      record.email = req.body.email ?? record.email;

      await record.save();

      return res.json({
        success: true,
        message: "User certificate updated",
        data: record,
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  };

/* ======================================================
   🔵 ADMIN: Delete user certificate
====================================================== */
export const deleteUserCertificate = async (req, res) => {
  try {
    const record = await UserCertificate.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Certificate record not found",
      });
    }

    // ❌ Delete PDF from Cloudinary
    if (record.pdfPublicId) {
      await destroyFromCloudinary(record.pdfPublicId);
    }

    await record.deleteOne();

    return res.json({
      success: true,
      message: "Certificate record deleted",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
