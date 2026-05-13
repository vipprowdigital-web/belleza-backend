import slugify from "slugify";
import Course from "../models/courses/course.model.js";

import {
  uploadToCloudinary,
  destroyFromCloudinary,
} from "../utils/cloudinaryService.js";
import mongoose from "mongoose";

// Format mongoose validation errors
const formatErrors = (err) => {
  const errors = {};
  if (err.errors) {
    for (const [key, value] of Object.entries(err.errors)) {
      errors[key] = value.message;
    }
  }
  return errors;
};

/* ============================
   🟢 PUBLIC CONTROLLERS
============================ */

export const getAllActiveCourses = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const sortBy = req.query.sortBy || "createdAt"; // Added
    const sortOrder = req.query.sortOrder || "desc"; // Added: "asc" or "desc"

    const search = req.query.search?.trim() || "";
    const categories = req.query.categories?.split(",") || [];

    // ------------------------------
    // Build Match Query
    // ------------------------------
    const matchQuery = { isActive: true };

    // FIX: Convert category IDs to ObjectIds
    if (categories.length > 0 && categories[0] !== "") {
      matchQuery.category = {
        $in: categories.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    // Search Filter (title, description, category name)
    const searchQuery = search
      ? {
          $or: [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
            { "category.name": { $regex: search, $options: "i" } },
          ],
        }
      : {};

    // ------------------------------
    // DYNAMIC SORT
    // ------------------------------
    const sortDirection = sortOrder === "asc" ? 1 : -1;

    // ------------------------------
    // AGGREGATION PIPELINE
    // ------------------------------
    const pipeline = [
      { $match: matchQuery },

      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },

      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },

      { $match: searchQuery },
      { $sort: { [sortBy]: sortDirection } }, // ✅ Dynamic sort
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ];

    const countPipeline = [
      { $match: matchQuery },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      { $match: searchQuery },
      { $count: "total" },
    ];

    const [courses, countResult] = await Promise.all([
      Course.aggregate(pipeline),
      Course.aggregate(countPipeline),
    ]);

    res.status(200).json({
      success: true,
      data: courses,
      pagination: {
        total: countResult[0]?.total || 0,
        page,
        limit,
        totalPages: Math.ceil((countResult[0]?.total || 0) / limit),
      },
    });
  } catch (err) {
    console.error("❌ Error fetching courses:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate("category", "name slug")
      .lean();

    if (!course)
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });

    res.json({ success: true, data: course });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getAllActiveCoursesNames = async (req, res) => {
  try {
    const course = await Course.find().select("title _id");

    if (!course)
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });

    res.status(200).json({
      success: true,
      data: course,
    });
  } catch (err) {
    console.error("❌ Error fetching courses name:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/* ============================
   🔒 ADMIN — GET ALL COURSES
============================ */

export const getAllCourses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      sortOrder = "desc",
      filter = "all",
    } = req.query;

    let filterQuery = {};

    // ⭐ Status filters
    if (filter === "active") filterQuery.isActive = true;
    if (filter === "inactive") filterQuery.isActive = false;

    // ⭐ Featured filters
    if (filter === "featured") filterQuery.isFeature = true;
    if (filter === "nonfeatured") filterQuery.isFeature = false;

    // ⭐ Search filter
    const searchQuery = search
      ? {
          $or: [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
            { "seo.metaKeywords": { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const finalQuery = { ...filterQuery, ...searchQuery };

    const total = await Course.countDocuments(finalQuery);

    const courses = await Course.find(finalQuery)
      .populate("category", "name slug")
      .populate("createdBy updatedBy", "name email")
      .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: courses,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/* ============================
   🟢 CREATE COURSE
============================ */

export const createCourse = async (req, res) => {
  const uploaded = { thumbnail: null, gallery: [] };

  try {
    const { title, category, isActive, isFeature } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        errors: { title: "Title is required" },
      });
    }

    const slug = slugify(title, { lower: true, strict: true });

    if (await Course.findOne({ slug })) {
      return res
        .status(400)
        .json({ success: false, message: "Title already exists" });
    }

    let thumbnailUrl = null;

    /* Upload Thumbnail */
    if (req.files?.thumbnail?.[0]?.path) {
      const upload = await uploadToCloudinary(
        req.files.thumbnail[0].path,
        "course/thumbnails"
      );
      thumbnailUrl = upload.secure_url;
      uploaded.thumbnail = upload.public_id;
    }

    /* Upload Gallery */
    const gallery_images = [];
    if (req.files?.gallery_images?.length) {
      for (const file of req.files.gallery_images) {
        const up = await uploadToCloudinary(file.path, "course/gallery");
        gallery_images.push(up.secure_url);
        uploaded.gallery.push(up.public_id);
      }
    }

    const course = await Course.create({
      title,
      slug,
      category: category || null,
      short_description: req.body.short_description,
      description: req.body.description,
      level: req.body.level,
      duration: req.body.duration,
      price: req.body.price,
      sale_price: req.body.sale_price,
      lessons_count: req.body.lessons_count,
      intro_video: req.body.intro_video,
      thumbnail: thumbnailUrl,
      gallery_images,
      seo: req.body.seo,
      isActive,
      isFeature,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: course });
  } catch (err) {
    // rollback uploaded assets
    if (uploaded.thumbnail) destroyFromCloudinary(uploaded.thumbnail);
    for (const id of uploaded.gallery) destroyFromCloudinary(id);

    res.status(500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};

/* ============================
   🟣 UPDATE COURSE (PUT)
============================ */

export const updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course)
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });

    const {
      title,
      category,
      isActive,
      isFeature,
      remove_gallery = "[]",
      keep_gallery = "[]",
    } = req.body;

    const removeList = JSON.parse(remove_gallery);
    const keepList = JSON.parse(keep_gallery);

    /* Replace thumbnail */
    if (req.files?.thumbnail?.[0]) {
      if (course.thumbnail) {
        const id = course.thumbnail.split("/").pop().split(".")[0];
        await destroyFromCloudinary(`course/thumbnails/${id}`);
      }

      const up = await uploadToCloudinary(
        req.files.thumbnail[0].path,
        "course/thumbnails"
      );
      course.thumbnail = up.secure_url;
    }

    /* Remove gallery images */
    for (const url of removeList) {
      if (course.gallery_images.includes(url)) {
        const id = url.split("/").pop().split(".")[0];
        await destroyFromCloudinary(`course/gallery/${id}`);
      }
    }

    let newGallery = keepList;

    /* Add new gallery images */
    if (req.files?.gallery_images?.length) {
      for (const file of req.files.gallery_images) {
        const up = await uploadToCloudinary(file.path, "course/gallery");
        newGallery.push(up.secure_url);
      }
    }

    course.gallery_images = newGallery;

    // update fields
    if (title) {
      course.title = title;
      course.slug = slugify(title, { lower: true, strict: true });
    }

    if (category !== undefined) course.category = category;

    course.short_description = req.body.short_description;
    course.description = req.body.description;
    course.level = req.body.level;
    course.duration = req.body.duration;
    course.price = req.body.price;
    course.sale_price = req.body.sale_price;
    course.lessons_count = req.body.lessons_count;
    course.intro_video = req.body.intro_video;
    course.seo = req.body.seo || course.seo;

    if (isActive !== undefined) course.isActive = isActive;
    if (isFeature !== undefined) course.isFeature = isFeature;

    course.updatedBy = req.user._id;
    await course.save();

    res.json({ success: true, data: course });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/* ============================
   🟡 PARTIAL UPDATE (PATCH)
============================ */

export const partiallyUpdateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course)
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });

    const allowed = [
      "title",
      "short_description",
      "description",
      "category",
      "level",
      "duration",
      "price",
      "sale_price",
      "lessons_count",
      "intro_video",
      "isActive",
      "isFeature",
      "seo",
    ];

    Object.entries(req.body).forEach(([key, value]) => {
      if (allowed.includes(key)) course[key] = value;
    });

    if (req.body.title) {
      course.slug = slugify(req.body.title, { lower: true, strict: true });
    }

    course.updatedBy = req.user._id;
    await course.save();

    res.json({ success: true, data: course });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/* ============================
   🔴 DELETE COURSE
============================ */

export const destroyCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course)
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });

    // delete thumbnail
    if (course.thumbnail) {
      const id = course.thumbnail.split("/").pop().split(".")[0];
      await destroyFromCloudinary(`course/thumbnails/${id}`);
    }

    // delete gallery
    for (const img of course.gallery_images) {
      const id = img.split("/").pop().split(".")[0];
      await destroyFromCloudinary(`course/gallery/${id}`);
    }

    await course.deleteOne();

    res.json({ success: true, message: "Course deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
