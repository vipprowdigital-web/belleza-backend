import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import Branch from "../models/branch.model.js";
import {
  destroyFromCloudinary,
  uploadToCloudinary,
} from "../utils/cloudinaryService.js";

// Get Logged-in User's Profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password").lean();
    
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Fetch branch information
    const branch = await Branch.findById(user.branchId);

    console.log("Data from get profile: ", user);
    console.log("Data from branch: ", branch);

    res.status(200).json({
      message: "Profile fetched successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || null,
        provider: user.provider,
        createdAt: user.createdAt
      },
      branch: branch ? {
        id: branch._id,
        name: branch.name,
        slug: branch.slug,
        subdomain: branch.subdomain,
        customDomain: branch.customDomain,
      } : null,
    });
  } catch (error) {
    console.error("Error fetching profile: ", error.message);
    return res
      .status(500)
      .json({ message: "Error fetching profile.", error: error.message });
  }
};

// ✅ Update Logged-in User's Profile
export const updateProfileById = async (req, res) => {
  try {
    // ✅ Use ID from token (set by ensureAuth middleware)
    const userId = req.user?.id;
    const { name, email, password, branchName, subdomain, customDomain } = req.body || {};

    // console.log("Updated profile: ", userId);

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized. Please login again." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    let updatedFields = {};
    let branchUpdatedFields = {};
    let avatarUrl = null;

    // ✅ Handle avatar upload (form-data)
    if (req.files?.avatar?.[0]?.path) {
      try {
        const upload = await uploadToCloudinary(
          req.files.avatar[0].path,
          "users/avatar"
        );
        avatarUrl = upload.secure_url;

        // Delete old avatar if exists
        if (user.avatar) {
          const oldPublicId = user.avatar.split("/").pop().split(".")[0];
          await destroyFromCloudinary(`users/avatar/${oldPublicId}`);
        }

        updatedFields.avatar = avatarUrl;
      } catch (err) {
        console.warn("⚠️ Avatar upload failed:", err.message);
      }
    }

    // ✅ Hash password if provided
    if (password?.trim()) {
      updatedFields.password = await bcrypt.hash(password, 10);
    }

    // ✅ Update name/email if provided
    if (name && name !== user.name) updatedFields.name = name;
    if (email && email !== user.email) updatedFields.email = email;

    // ✅ Handle branch updates
    if (branchName || subdomain || customDomain) {
      const branch = await Branch.findById(user.branchId);
      if (!branch) {
        return res.status(404).json({ message: "Branch not found." });
      }

      // Update branch name if provided
      if (branchName && branchName !== branch.name) {
        branchUpdatedFields.name = branchName;
        branchUpdatedFields.slug = branchName.toLowerCase().replace(/\s+/g, '-');
      }

      // Check if subdomain already exists (if being changed)
      if (subdomain && subdomain.toLowerCase() !== branch.subdomain) {
        const existingSubdomain = await Branch.findOne({ 
          subdomain: subdomain.toLowerCase(),
          _id: { $ne: branch._id }
        });
        if (existingSubdomain) {
          return res.status(400).json({ message: "Subdomain already taken." });
        }
        branchUpdatedFields.subdomain = subdomain.toLowerCase();
      }

      // Note: Multiple admins can use the same custom domain, so we don't validate uniqueness for customDomain
      if (customDomain && customDomain !== branch.customDomain) {
        branchUpdatedFields.customDomain = customDomain;
      }
    }

    // ✅ If nothing changed
    if (Object.keys(updatedFields).length === 0 && Object.keys(branchUpdatedFields).length === 0) {
      return res.status(400).json({ message: "No changes detected." });
    }

    // ✅ Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updatedFields },
      { new: true, runValidators: true, select: "-password" }
    );

    // Update branch if there are changes
    let updatedBranch = null;
    if (Object.keys(branchUpdatedFields).length > 0) {
      updatedBranch = await Branch.findByIdAndUpdate(
        user.branchId,
        { $set: branchUpdatedFields },
        { new: true }
      );
    } else {
      updatedBranch = await Branch.findById(user.branchId);
    }

    return res.status(200).json({
      message: "User profile and branch information updated successfully.",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: updatedUser.avatar || null,
        provider: updatedUser.provider,
      },
      branch: updatedBranch ? {
        id: updatedBranch._id,
        name: updatedBranch.name,
        slug: updatedBranch.slug,
        subdomain: updatedBranch.subdomain,
        customDomain: updatedBranch.customDomain,
      } : null,
    });
  } catch (error) {
    console.error("❌ Error updating user profile:", error);
    return res.status(500).json({
      message: "Internal Server Error while updating profile.",
      error: error.message,
    });
  }
};
