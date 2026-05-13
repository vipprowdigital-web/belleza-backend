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

/* ---------------------- PUBLIC ROUTE ---------------------- */
// Create new contact message (Public)
router.post("/", createContactUs);

/* ---------------------- ADMIN ROUTES ---------------------- */

// Get paginated contact messages
router.get("/", ensureAuth, getAllContactUs);

// Get contact message by ID
router.get("/:id", ensureAuth, getContactUsById);

// Full Update Contact (PUT)
router.put("/:id", ensureAuth, updateContactUs);

// PARTIAL UPDATE Contact (PATCH) - update status, mark read, etc.
router.patch("/:id", ensureAuth, partiallyUpdateContactUs);

// Admin respond to contact message
router.post("/respond/:id", ensureAuth, respondToContactUs);

// Delete contact message
router.delete("/:id", ensureAuth, destroyContactUsById);

export default router;
