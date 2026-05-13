import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import {
  destroyFromCloudinary,
  uploadToCloudinary,
} from "../utils/cloudinaryService.js";

// Get Logged-in User's to these Profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password").lean();
    res.status(200).json({ message: "Profile fetch successfully", user });
  } catch (error) {
    console.error("Error feching profile: ", error.message);

    return res
      .status(500)
      .json({ message: "Error feching profile.", error: error.message });
  }
};

// ✅ Update Logged-in User's Profile
export const updateProfileById = async (req, res) => {
  try {
    // ✅ Use ID from token (set by ensureAuth middleware)
    const userId = req.user?.id;
    const { name, email, password } = req.body || {};

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

    // ✅ If nothing changed
    if (Object.keys(updatedFields).length === 0) {
      return res.status(400).json({ message: "No changes detected." });
    }

    // ✅ Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updatedFields },
      { new: true, runValidators: true, select: "-password" }
    );

    return res.status(200).json({
      message: "✅ User profile updated successfully.",
      data: updatedUser,
    });
  } catch (error) {
    console.error("❌ Error updating user profile:", error);
    return res.status(500).json({
      message: "Internal Server Error while updating profile.",
      error: error.message,
    });
  }
};
