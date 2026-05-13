import ContactUs from "../models/contactus.model.js";
import mongoose from "mongoose";

/* ============================================================
   📌 CREATE ContactUs (Public)
============================================================ */
export const createContactUs = async (req, res) => {
  try {
    const { name, phone, message, courseName, preferredLocation } = req.body;
    console.log("Req data: ", req.body);

    // Validate required fields
    // if (!type) {
    //   return res.status(400).json({
    //     status: "error",
    //     message: "Form type is required.",
    //   });
    // }

    if (!name || !phone) {
      return res.status(400).json({
        status: "error",
        message: "Name & Phone are required.",
      });
    }

    // if (services && Array.isArray(services)) {
    //   const isInvalid = services.some(
    //     (id) => !mongoose.Types.ObjectId.isValid(id),
    //   );

    //   if (isInvalid) {
    //     return res.status(400).json({
    //       status: "error",
    //       message: "Invalid Service ID detected.",
    //     });
    //   }
    // }

    // ---------------------------------------------
    // 🌟 CREATE DOCUMENT
    // ---------------------------------------------
    const contact = await ContactUs.create({
      name,
      // email,
      phone: phone || null,
      courseName,
      preferredLocation,
      // subject: subject || null,
      message,
      // meta: meta || {},
      // services: services || null, // 👈 ADD THIS
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      createdBy: req.user?._id || null,
    });

    return res.status(201).json({
      status: "success",
      message: "Form submitted successfully.",
      data: contact,
    });
  } catch (error) {
    console.error("❌ Error creating contact:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Internal Server Error" });
  }
};

/* ============================================================
   📌 GET ALL ContactUs (Admin)
============================================================ */
export const getAllContactUs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const total = await ContactUs.countDocuments();

    const messages = await ContactUs.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json({
      status: "success",
      message: "Contact messages fetched successfully.",
      data: messages,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching contact list:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Internal Server Error" });
  }
};

/* ============================================================
   📌 GET ContactUs by ID
============================================================ */
export const getContactUsById = async (req, res) => {
  try {
    const contact = await ContactUs.findById(req.params.id).lean();

    if (!contact) {
      return res.status(404).json({
        status: "error",
        message: "Contact message not found.",
      });
    }

    return res.status(200).json({
      status: "success",
      data: contact,
    });
  } catch (error) {
    console.error("❌ Error fetching contact:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Internal Server Error" });
  }
};

/* ============================================================
   📌 PUT — Full Update
============================================================ */
export const updateContactUs = async (req, res) => {
  try {
    const data = req.body;

    const updated = await ContactUs.findByIdAndUpdate(req.params.id, data, {
      new: true,
    });

    if (!updated) {
      return res
        .status(404)
        .json({ status: "error", message: "Contact not found." });
    }

    return res.status(200).json({
      status: "success",
      message: "Contact updated successfully.",
      data: updated,
    });
  } catch (error) {
    console.error("❌ Error updating contact:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Internal Server Error" });
  }
};

/* ============================================================
   📌 PATCH — Partial Update (status, read, etc.)
============================================================ */
export const partiallyUpdateContactUs = async (req, res) => {
  try {
    const data = req.body;

    const updated = await ContactUs.findByIdAndUpdate(
      req.params.id,
      { $set: data },
      { new: true },
    );

    if (!updated) {
      return res
        .status(404)
        .json({ status: "error", message: "Contact not found." });
    }

    return res.status(200).json({
      status: "success",
      message: "Contact partially updated.",
      data: updated,
    });
  } catch (error) {
    console.error("❌ Error partial updating contact:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Internal Server Error" });
  }
};

/* ============================================================
   📌 ADMIN Respond to Contact Message
============================================================ */
export const respondToContactUs = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({
        status: "error",
        message: "Response message cannot be empty.",
      });
    }

    const contact = await ContactUs.findById(req.params.id);
    if (!contact) {
      return res
        .status(404)
        .json({ status: "error", message: "Contact not found." });
    }

    contact.response = {
      message,
      respondedBy: req.user._id,
      respondedAt: new Date(),
    };

    contact.replies.push({
      message,
      respondedBy: req.user._id,
    });

    contact.status = "answered";

    await contact.save();

    return res.status(200).json({
      status: "success",
      message: "Response added successfully.",
      data: contact,
    });
  } catch (error) {
    console.error("❌ Error responding contact:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Internal Server Error" });
  }
};

/* ============================================================
   📌 DELETE ContactUs by ID
============================================================ */
export const destroyContactUsById = async (req, res) => {
  try {
    const deleted = await ContactUs.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        status: "error",
        message: "Contact message not found.",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Contact message deleted successfully.",
      data: deleted,
    });
  } catch (error) {
    console.error("❌ Error deleting contact:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Internal Server Error" });
  }
};
