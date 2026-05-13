import slugify from "slugify";
import Policy from "../models/policy.model.js";

/* =====================================================
   🔒 ADMIN ROUTES
===================================================== */

/** 📄 Get All Policies (Paginated for Admin) */
export const getPolicies = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const total = await Policy.countDocuments();

    const policies = await Policy.find()
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json({
      message: "✅ Policies fetched successfully.",
      data: policies,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching policies:", error.message);
    res.status(500).json({ message: "Internal Error", error: error.message });
  }
};

/** 🔍 Get Policy by ID (Admin) */
export const getPolicyById = async (req, res) => {
  try {
    const { id } = req.params;
    const policy = await Policy.findById(id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .lean();

    if (!policy) {
      return res.status(404).json({ message: "Policy not found." });
    }

    return res.status(200).json({
      message: "✅ Policy fetched successfully.",
      data: policy,
    });
  } catch (error) {
    console.error("❌ Error fetching policy:", error.message);
    res.status(500).json({ message: "Internal Error", error: error.message });
  }
};

/** ➕ Create Policy */
export const createPolicy = async (req, res) => {
  try {
    const { title, description, isActive } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: "Policy title is required." });
    }

    const slug = slugify(title, { lower: true, strict: true });
    const existing = await Policy.findOne({ slug });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Policy with this title already exists." });
    }

    const policy = await Policy.create({
      title,
      slug,
      description: description || "",
      isActive: typeof isActive === "boolean" ? isActive : true,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      message: "✅ Policy created successfully.",
      data: policy,
    });
  } catch (error) {
    console.error("❌ Error creating policy:", error.message);
    res.status(500).json({ message: "Internal Error", error: error.message });
  }
};

/** ✏️ Update Policy (PUT) */
export const updatePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, isActive } = req.body;

    const policy = await Policy.findById(id);
    if (!policy) {
      return res.status(404).json({ message: "Policy not found." });
    }

    // If title changes, regenerate slug
    if (title && title !== policy.title) {
      const newSlug = slugify(title, { lower: true, strict: true });
      const duplicate = await Policy.findOne({
        slug: newSlug,
        _id: { $ne: id },
      });
      if (duplicate) {
        return res
          .status(400)
          .json({ message: "Another policy with this title already exists." });
      }
      policy.title = title;
      policy.slug = newSlug;
    }

    policy.description = description ?? policy.description;
    policy.isActive = isActive ?? policy.isActive;
    policy.updatedBy = req.user._id;

    await policy.save();

    return res.status(200).json({
      message: "✅ Policy updated successfully.",
      data: policy,
    });
  } catch (error) {
    console.error("❌ Error updating policy:", error.message);
    res.status(500).json({ message: "Internal Error", error: error.message });
  }
};

/** 🔄 Partially Update Policy (PATCH) */
export const partiallyUpdatePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id) return res.status(400).json({ message: "Policy ID is required." });

    const policy = await Policy.findById(id);
    if (!policy) {
      return res.status(404).json({ message: "Policy not found." });
    }

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && key !== "_id") {
        if (key === "title") {
          policy.slug = slugify(value, { lower: true, strict: true });
        }
        policy[key] = value;
      }
    }

    policy.updatedBy = req.user._id;
    await policy.save();

    return res.status(200).json({
      message: "✅ Policy partially updated successfully.",
      data: policy,
    });
  } catch (error) {
    console.error("❌ Error partially updating policy:", error.message);
    res.status(500).json({ message: "Internal Error", error: error.message });
  }
};

/** 🗑️ Delete Policy */
export const destroyPolicyById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "Policy ID is required." });

    const policy = await Policy.findById(id);
    if (!policy) {
      return res.status(404).json({ message: "Policy not found." });
    }

    await Policy.findByIdAndDelete(id);

    return res.status(200).json({
      message: `✅ Policy "${policy.title}" deleted successfully.`,
      id,
    });
  } catch (error) {
    console.error("❌ Error deleting policy:", error.message);
    res.status(500).json({ message: "Internal Error", error: error.message });
  }
};

/* =====================================================
   🌐 PUBLIC ROUTES
===================================================== */

/** 📢 Get All Active Policies (Public) */
export const getAllActivePolicies = async (req, res) => {
  try {
    const policies = await Policy.find({ isActive: true })
      .select("title")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      message: "✅ Active policies fetched successfully.",
      count: policies.length,
      data: policies,
    });
  } catch (error) {
    console.error("❌ Error fetching active policies:", error.message);
    res.status(500).json({ message: "Internal Error", error: error.message });
  }
};

/** 🔍 Get Active Policy by ID (Public) */
export const getActivePolicyById = async (req, res) => {
  try {
    const policy = await Policy.findById(req.params.id).lean();

    if (!policy) {
      return res
        .status(404)
        .json({ message: `No active policy found for id: ${id}` });
    }

    return res.status(200).json({
      message: "✅ Policy fetched successfully.",
      data: policy,
    });
  } catch (error) {
    console.error("❌ Error fetching policy by slug:", error.message);
    res.status(500).json({ message: "Internal Error", error: error.message });
  }
};
