import appConfig from "../models/appConfig.model.js";
import Branch from "../models/branch.model.js";

/**
 * Get app config for frontend by subdomain (branch-specific)
 */
export const getFrontendAppConfig = async (req, res) => {
  try {
    const { subdomain } = req.query;

    // console.log("Subdomain: ", subdomain);

    // Validate subdomain
    if (!subdomain) {
      return res.status(400).json({
        status: "error",
        message: "Subdomain is required as query parameter.",
      });
    }

    // Find branch by subdomain
    const branch = await Branch.findOne({ subdomain: subdomain.toLowerCase() }).lean();

    if (!branch) {
      return res.status(404).json({
        status: "error",
        message: "Branch not found.",
      });
    }

    // console.log("Branch: ", branch);

    const config = await appConfig.findOne({ branchId: branch._id }).lean();

    if (!config) {
      return res.status(404).json({
        status: "error",
        message: "App configuration not found for this branch.",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "App Config fetched successfully.",
      data: config,
    });
  } catch (error) {
    console.error("Error fetching app config:", error.message);
    return res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/**
 * Get app config for admin (branch-specific)
 */
export const getAppConfig = async (req, res) => {
  try {
    const branchId = req.user?.branchId;

    if (!branchId) {
      return res.status(401).json({
        status: "error",
        message: "Branch ID not found. Please login again.",
      });
    }

    const app_config_data = await appConfig.findOne({ branchId });

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

/**
 * Modify/update app config for admin (branch-specific)
 */
export const modifyAppConfig = async (req, res) => {
  try {
    const branchId = req.user?.branchId;

    if (!branchId) {
      return res.status(401).json({ message: "Branch ID not found. Please login again." });
    }

    // Accept ALL fields dynamically
    const updateData = req.body;

    // Validate required fields
    if (!updateData.appName || !updateData.email || !updateData.phoneNumber) {
      return res
        .status(400)
        .json({ message: "App Name, Email & Phone Number are required" });
    }

    // Check existing config for this branch
    let app = await appConfig.findOne({ branchId });

    if (!app) {
      // Create New Config for this branch
      app = await appConfig.create({
        ...updateData,
        branchId,
      });
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
