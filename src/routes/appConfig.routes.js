import { Router } from "express";
import { ensureAuth } from "../middleware/authMiddleware.js";
import { getAppConfig, getPublicAppConfig, modifyAppConfig } from "../controllers/appConfig.controller.js";

const router = Router();

// 🟢 Public: Get latest App Config (no auth)
router.get("/public", getPublicAppConfig);

// 🔒 Admin: Get / Update App Config
router.get("/", ensureAuth, getAppConfig);
router.post("/", ensureAuth, modifyAppConfig);

export default router;
