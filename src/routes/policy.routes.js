import { Router } from "express";
import { ensureAuth } from "../middleware/authMiddleware.js";
import {
  createPolicy,
  destroyPolicyById,
  getPolicies,
  getPolicyById,
  partiallyUpdatePolicy,
  updatePolicy,
  getAllActivePolicies,
  getActivePolicyById,
} from "../controllers/policy.controller.js";

const router = Router();

/* ===========================
   🌐 PUBLIC ROUTES
=========================== */
// Get all active public policies
router.get("/public", getAllActivePolicies);

// Get a specific public policy by slug
router.get("/public/:id", getActivePolicyById);

/* ===========================
   🔒 ADMIN ROUTES
=========================== */
// Paginated list of all policies
router.get("/", ensureAuth, getPolicies);

// Get a policy by ID (admin)
router.get("/:id", ensureAuth, getPolicyById);

// Create a new policy
router.post("/", ensureAuth, createPolicy);

// Update (PUT) an existing policy
router.put("/:id", ensureAuth, updatePolicy);

// Partially update (PATCH) a policy
router.patch("/:id", ensureAuth, partiallyUpdatePolicy);

// Delete a policy
router.delete("/:id", ensureAuth, destroyPolicyById);

export default router;
