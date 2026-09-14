import { Router } from "express";
import { ensureAuth } from "../middleware/authMiddleware.js";

import {
  createContactUs,
  getAllContactUs,
  getContactUsById,
  updateContactUs,
  partiallyUpdateContactUs,
  destroyContactUsById,
  respondToContactUs,
} from "../controllers/contactus.controller.js";

const router = Router();

/* ================================
   🟢 FRONTEND ROUTES (Submit & Display - No Auth Required)
   ================================ */

// ✅ Frontend - Submit contact form by subdomain (public submission)
router.post("/frontend", createContactUs);

/* ================================
   🔒 ADMIN ROUTES (Manage Submissions - Auth Required)
   ================================ */

// ✅ Get paginated contact messages (branch-specific)
router.get("/", ensureAuth, getAllContactUs);

// ✅ Get contact message by ID (branch-specific)
router.get("/:id", ensureAuth, getContactUsById);

// ✅ Full Update Contact (PUT, branch-specific)
router.put("/:id", ensureAuth, updateContactUs);

// ✅ PARTIAL UPDATE Contact (PATCH, branch-specific)
router.patch("/:id", ensureAuth, partiallyUpdateContactUs);

// ✅ Admin respond to contact message (branch-specific)
router.post("/respond/:id", ensureAuth, respondToContactUs);

// ✅ Delete contact message (branch-specific)
router.delete("/:id", ensureAuth, destroyContactUsById);

export default router;
