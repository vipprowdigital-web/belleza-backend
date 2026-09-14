import { Router } from "express";
import { ensureAuth } from "../middleware/authMiddleware.js";
import { getAppConfig, modifyAppConfig, getFrontendAppConfig } from "../controllers/appConfig.controller.js";

const router = Router();

/* ================================
   🟢 FRONTEND ROUTES (Display Data - No Auth Required)
   ================================ */

// ✅ Get app config for frontend by subdomain
router.get("/frontend", getFrontendAppConfig);

/* ================================
   🔒 ADMIN ROUTES (Manage Data - Auth Required)
   ================================ */

// ✅ Admin: Get / Update App Config (branch-specific)
router.get("/", ensureAuth, getAppConfig);
router.post("/", ensureAuth, modifyAppConfig);

export default router;
