import appConfig from "../models/appConfig.model.js";

/**
 * 🔓 Get latest App Config (Public)
 */
export const getPublicAppConfig = async (req, res) => {
  try {
    const latestConfig = await appConfig
      .findOne()
      .sort({ createdAt: -1 })
      .lean();

    if (!latestConfig) {
      return res.status(404).json({ message: "App Config not found." });
    }

    return res.status(200).json({
      message: "Public App Config fetched successfully.",
      data: latestConfig,
    });
  } catch (error) {
    console.error("❌ Error fetching public app config:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

/**
 * 🔓 Get latest App Config (Protected)
 */

// Get
export const getAppConfig = async (req, res) => {
  try {
    const app_config_data = await appConfig.findOne();

    if (!app_config_data) {
      return res.status(404).json({
        message: "App Config Data not found...",
      });
    }
    return res.status(200).json({
      message: "App Config Fetched...",
      app_config_data,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error });
  }
};

export const modifyAppConfig = async (req, res) => {
  try {
    // Accept ALL fields dynamically
    const updateData = req.body;

    // Validate required fields
    if (!updateData.appName || !updateData.email || !updateData.phoneNumber) {
      return res
        .status(400)
        .json({ message: "App Name, Email & Phone Number are required" });
    }

    // Check existing config
    let app = await appConfig.findOne();

    if (!app) {
      // Create New Config
      app = await appConfig.create(updateData);
    } else {
      // Update Existing
      app = await appConfig.findByIdAndUpdate(app._id, updateData, {
        new: true,
        runValidators: true,
      });
    }

    return res.status(201).json({
      message: "App Config Updated Successfully",
      data: app,
    });
  } catch (error) {
    console.error("❌ Modify App Config Error:", error);
    return res.status(500).json({
      message: "Internal Server Error - App Config Controller",
      error: error.message,
    });
  }
};
