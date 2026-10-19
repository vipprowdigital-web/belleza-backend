// src/scripts/migrateToMultiBranch.js
//
// One-time migration to run AFTER merging `multi-user-access` into `main`,
// against the ONE existing database you are keeping as the shared/master DB
// (the one that already has your ~20 courses in it).
//
// What it does:
//   1. Creates (or reuses) a single Branch document for THIS database's
//      current live branch (the "primary" branch).
//   2. Backfills `branchId` on existing docs that predate the multi-branch
//      change and are missing it: User, ContactUs, Gallery, Testimonial.
//   3. Deletes orphaned appConfig doc(s) that have no branchId (you said
//      these can just be recreated from the admin panel after deploy).
//   4. Leaves the `Course` collection completely untouched — it has no
//      branchId and stays shared across every branch, which is the point.
//
// What it deliberately does NOT do:
//   - It does not touch the other 3 branches' old databases. Nothing is
//     copied over from them. Their admins should register fresh against
//     this same consolidated backend via POST /api/v1/auth/register
//     (name, email, password, branchName, subdomain, customDomain) once
//     this backend is live — that call creates their Branch + User here,
//     and they immediately see the same shared courses.
//
// Usage:
//   1. Fill in PRIMARY_BRANCH below with the real values for the branch
//      that owns this database.
//   2. Dry run first (no writes, just prints what WOULD change):
//        node src/scripts/migrateToMultiBranch.js --dry-run
//   3. Then run it for real:
//        node src/scripts/migrateToMultiBranch.js
//
// Safe to re-run: every step only touches documents missing a branchId
// (or, for Branch itself, upserts by subdomain), so running it twice is a
// no-op the second time.

import mongoose from "mongoose";
import dotenv from "dotenv";

import Branch from "../models/branch.model.js";
import User from "../models/user.model.js";
import ContactUs from "../models/contactus.model.js";
import Gallery from "../models/gallery.model.js";
import Testimonial from "../models/testimonial.model.js";
import appConfig from "../models/appConfig.model.js";

dotenv.config();

// ===============================================
// ✏️  EDIT THIS — the branch that owns THIS database
// ===============================================
const PRIMARY_BRANCH = {
  name: "Dehradun", // display name
  slug: "dehradun", // url-safe slug
  subdomain: "dehradun", // matches Branch.subdomain used by /frontend routes
  customDomain: "bellezaschool.com",
};

const DRY_RUN = process.argv.includes("--dry-run");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Connected to ${mongoose.connection.name}`);
  console.log(
    DRY_RUN
      ? "DRY RUN — no writes will be made\n"
      : "LIVE RUN — writes will be made\n",
  );

  // -----------------------------------------------
  // 1. Upsert the primary Branch
  // -----------------------------------------------
  let branch = await Branch.findOne({ subdomain: PRIMARY_BRANCH.subdomain });

  if (branch) {
    console.log(
      `ℹ️  Branch "${PRIMARY_BRANCH.subdomain}" already exists: ${branch._id}`,
    );
  } else if (DRY_RUN) {
    console.log(`Would create Branch "${PRIMARY_BRANCH.subdomain}"`);
    branch = { _id: "<new-branch-id>" }; // placeholder for dry-run logging below
  } else {
    branch = await Branch.create(PRIMARY_BRANCH);
    console.log(
      `➕ Created Branch "${PRIMARY_BRANCH.subdomain}": ${branch._id}`,
    );
  }

  const branchId = branch._id;

  // -----------------------------------------------
  // 2. Backfill branchId on existing docs missing it
  // -----------------------------------------------
  const collections = [
    { label: "User", Model: User },
    { label: "ContactUs", Model: ContactUs },
    { label: "Gallery", Model: Gallery },
    { label: "Testimonial", Model: Testimonial },
  ];

  for (const { label, Model } of collections) {
    const filter = { branchId: { $exists: false } };
    const count = await Model.countDocuments(filter);

    if (count === 0) {
      console.log(`✔️  ${label}: nothing to backfill`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`➕ Would backfill branchId on ${count} ${label} doc(s)`);
    } else {
      const result = await Model.updateMany(filter, { $set: { branchId } });
      console.log(
        `➕ Backfilled branchId on ${result.modifiedCount} ${label} doc(s)`,
      );
    }
  }

  // -----------------------------------------------
  // 3. appConfig — delete orphaned doc(s) missing branchId
  //    (per decision: recreate from admin panel after deploy)
  // -----------------------------------------------
  const orphanConfigFilter = { branchId: { $exists: false } };
  const orphanConfigCount = await appConfig.countDocuments(orphanConfigFilter);

  if (orphanConfigCount === 0) {
    console.log(`✔️  appConfig: nothing to clean up`);
  } else if (DRY_RUN) {
    console.log(
      `🗑️  Would delete ${orphanConfigCount} orphaned appConfig doc(s)`,
    );
  } else {
    const result = await appConfig.deleteMany(orphanConfigFilter);
    console.log(`🗑️  Deleted ${result.deletedCount} orphaned appConfig doc(s)`);
  }

  // -----------------------------------------------
  // 4. Course — confirm untouched
  // -----------------------------------------------
  const Course =
    mongoose.models.Course ||
    (await import("../models/courses/course.model.js")).default;
  const courseCount = await Course.countDocuments();
  console.log(
    `✔️  Course: ${courseCount} course(s) left untouched (shared across all branches)`,
  );

  console.log("\n✅ Migration check complete.");
  if (DRY_RUN) {
    console.log("Re-run without --dry-run to apply these changes.");
  } else {
    console.log(
      `Next: recreate app config for "${PRIMARY_BRANCH.subdomain}" from the admin panel, then register the other 3 branches via POST /api/v1/auth/register.`,
    );
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
