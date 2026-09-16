import ContactUs from "../models/contactus.model.js";
import Branch from "../models/branch.model.js";

/* ============================================================
   � FRONTEND CONTROLLERS (Submit Data - No Auth Required)
============================================================ */

/**
 * Submit contact us form (frontend - public submission with subdomain)
 */
export const createContactUs = async (req, res) => {
  try {
    const { name, phone, message, courseName, preferredLocation, subdomain } = req.body;

    // console.log("Req data: ", req.body);

    // Validate required fields
    if (!name || !phone) {
      return res.status(400).json({
        status: "error",
        message: "Name & Phone are required.",
      });
    }

    // Validate subdomain is provided
    if (!subdomain) {
      return res.status(400).json({
        status: "error",
        message: "Subdomain is required.",
      });
    }

    // Find branch by subdomain
    const branch = await Branch.findOne({ subdomain: subdomain.toLowerCase() }).lean();

    // console.log("Branch: ", branch);

    if (!branch) {
      return res.status(404).json({
        status: "error",
        message: "Branch not found.",
      });
    }

    // console.log("Branch: ", branch);

    // Create contact us submission
    const contact = await ContactUs.create({
      name,
      phone: phone || null,
      courseName,
      preferredLocation,
      message,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      branchId: branch._id,
      createdBy: null,
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
   🔒 ADMIN CONTROLLERS (Manage Submissions - Auth Required)
============================================================ */

/* ============================================================
   📌 GET ALL ContactUs (Admin)
============================================================ */
export const getAllContactUs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const branchId = req.user?.branchId;

    if (!branchId) {
      return res.status(401).json({
        status: "error",
        message: "Branch ID not found. Please login again.",
      });
    }

    // console.log("Branch id: ", branchId);

    const total = await ContactUs.countDocuments({ branchId });

    // console.log("Total number of contacts: ", total);
    
    const messages = await ContactUs.find({ branchId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
    
    // console.log("Data from contact: ", messages);

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
    const branchId = req.user?.branchId;

    if (!branchId) {
      return res.status(401).json({
        status: "error",
        message: "Branch ID not found. Please login again.",
      });
    }

    const contact = await ContactUs.findById(req.params.id)
      .where({ branchId })
      .lean();

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
    const branchId = req.user?.branchId;

    if (!branchId) {
      return res.status(401).json({
        status: "error",
        message: "Branch ID not found. Please login again.",
      });
    }

    const data = req.body;

    const contact = await ContactUs.findById(req.params.id);
    if (!contact) {
      return res
        .status(404)
        .json({ status: "error", message: "Contact not found." });
    }

    // Verify contact belongs to user's branch
    if (contact.branchId.toString() !== branchId.toString()) {
      return res.status(403).json({
        status: "error",
        message: "Unauthorized. This contact belongs to a different branch.",
      });
    }

    const updated = await ContactUs.findByIdAndUpdate(req.params.id, data, {
      new: true,
    });

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
    const branchId = req.user?.branchId;

    if (!branchId) {
      return res.status(401).json({
        status: "error",
        message: "Branch ID not found. Please login again.",
      });
    }

    const data = req.body;

    const contact = await ContactUs.findById(req.params.id);
    if (!contact) {
      return res
        .status(404)
        .json({ status: "error", message: "Contact not found." });
    }

    // Verify contact belongs to user's branch
    if (contact.branchId.toString() !== branchId.toString()) {
      return res.status(403).json({
        status: "error",
        message: "Unauthorized. This contact belongs to a different branch.",
      });
    }

    const updated = await ContactUs.findByIdAndUpdate(
      req.params.id,
      { $set: data },
      { new: true },
    );

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
    const branchId = req.user?.branchId;

    if (!branchId) {
      return res.status(401).json({
        status: "error",
        message: "Branch ID not found. Please login again.",
      });
    }

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

    // Verify contact belongs to user's branch
    if (contact.branchId.toString() !== branchId.toString()) {
      return res.status(403).json({
        status: "error",
        message: "Unauthorized. This contact belongs to a different branch.",
      });
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
    const branchId = req.user?.branchId;

    if (!branchId) {
      return res.status(401).json({
        status: "error",
        message: "Branch ID not found. Please login again.",
      });
    }

    const contact = await ContactUs.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({
        status: "error",
        message: "Contact message not found.",
      });
    }

    // Verify contact belongs to user's branch
    if (contact.branchId.toString() !== branchId.toString()) {
      return res.status(403).json({
        status: "error",
        message: "Unauthorized. This contact belongs to a different branch.",
      });
    }

    const deleted = await ContactUs.findByIdAndDelete(req.params.id);

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
