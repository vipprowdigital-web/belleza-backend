import slugify from "slugify";
import Blog from "../models/blogs/blog.model.js";
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

export const getAllActiveBlogs = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const sortBy = req.query.sortBy || "createdAt"; // Added
    const sortOrder = req.query.sortOrder || "desc"; // Added: "asc" or "desc"

    const search = req.query.search?.trim() || "";
    const categories = req.query.categories?.split(",") || [];

    // ------------------------------
    // Base Match Query
    // ------------------------------
    const matchQuery = { isActive: true };

    // 🏷 CATEGORY FILTER
    if (categories.length > 0 && categories[0] !== "") {
      matchQuery.category = {
        $in: categories.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    // 🔍 SEARCH by title, description, and category name
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

      // Join category data
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

    // Count pipeline
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

    const [blogs, countResult] = await Promise.all([
      Blog.aggregate(pipeline),
      Blog.aggregate(countPipeline),
    ]);

    const total = countResult[0]?.total || 0;

    res.status(200).json({
      success: true,
      data: blogs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("❌ Error fetching blogs:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate("category", "name slug")
      .lean();

    if (!blog)
      return res
        .status(404)
        .json({ success: false, message: "Blog not found" });

    res.json({ success: true, data: blog });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/* ============================
   🔒 ADMIN CONTROLLERS
============================ */

/* ============================
   🔒 ADMIN — GET ALL BLOGS (with filters)
============================ */
export const getAllBlogs = async (req, res) => {
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

    // ⭐ Final combined query
    const finalQuery = {
      ...filterQuery,
      ...searchQuery,
    };

    const total = await Blog.countDocuments(finalQuery);

    const blogs = await Blog.find(finalQuery)
      .populate("category", "name slug")
      .populate("createdBy updatedBy", "name email")
      .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: blogs,
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
   🟢 CREATE BLOG
============================ */

export const createBlog = async (req, res) => {
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

    if (await Blog.findOne({ slug })) {
      return res
        .status(400)
        .json({ success: false, message: "Title already exists" });
    }

    let thumbnailUrl = null;

    /* Upload Thumbnail */
    if (req.files?.thumbnail?.[0]?.path) {
      const upload = await uploadToCloudinary(
        req.files.thumbnail[0].path,
        "blog/thumbnails"
      );
      thumbnailUrl = upload.secure_url;
      uploaded.thumbnail = upload.public_id;
    }

    /* Upload Gallery */
    const gallery_images = [];
    if (req.files?.gallery_images?.length) {
      for (const file of req.files.gallery_images) {
        const up = await uploadToCloudinary(file.path, "blog/gallery");
        gallery_images.push(up.secure_url);
        uploaded.gallery.push(up.public_id);
      }
    }

    const blog = await Blog.create({
      title,
      slug,
      category: category || null,
      short_description: req.body.short_description,
      description: req.body.description,
      thumbnail: thumbnailUrl,
      gallery_images,
      seo: req.body.seo,
      isActive,
      isFeature,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: blog });
  } catch (err) {
    console.error(err);

    // rollback
    if (uploaded.thumbnail) destroyFromCloudinary(uploaded.thumbnail);
    for (const id of uploaded.gallery) destroyFromCloudinary(id);

    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/* ============================
   🟣 FULL UPDATE (PUT)
   Supports:
   - Add new images
   - Remove specific images
   - Keep old images
============================ */

export const updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog)
      return res
        .status(404)
        .json({ success: false, message: "Blog not found" });

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

    /* Replace thumbnail if new uploaded */
    if (req.files?.thumbnail?.[0]) {
      if (blog.thumbnail) {
        const id = blog.thumbnail.split("/").pop().split(".")[0];
        await destroyFromCloudinary(`blog/thumbnails/${id}`);
      }

      const up = await uploadToCloudinary(
        req.files.thumbnail[0].path,
        "blog/thumbnails"
      );
      blog.thumbnail = up.secure_url;
    }

    /* Remove gallery images */
    for (const url of removeList) {
      if (blog.gallery_images.includes(url)) {
        const id = url.split("/").pop().split(".")[0];
        await destroyFromCloudinary(`blog/gallery/${id}`);
      }
    }

    let newGallery = keepList; // keep old selected

    /* Add new gallery images */
    if (req.files?.gallery_images?.length) {
      for (const file of req.files.gallery_images) {
        const up = await uploadToCloudinary(file.path, "blog/gallery");
        newGallery.push(up.secure_url);
      }
    }

    blog.gallery_images = newGallery;

    // update other fields
    if (title) {
      blog.title = title;
      blog.slug = slugify(title, { lower: true, strict: true });
    }

    if (category !== undefined) blog.category = category;
    blog.short_description = req.body.short_description;
    blog.description = req.body.description;
    blog.seo = req.body.seo || blog.seo;

    if (isActive !== undefined) blog.isActive = isActive;
    if (isFeature !== undefined) blog.isFeature = isFeature;

    blog.updatedBy = req.user._id;
    await blog.save();

    res.json({ success: true, data: blog });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/* ============================
   🟡 PARTIAL UPDATE (PATCH)
   No file uploads
============================ */

export const partiallyUpdateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog)
      return res
        .status(404)
        .json({ success: false, message: "Blog not found" });

    const allowed = [
      "title",
      "short_description",
      "description",
      "category",
      "isActive",
      "isFeature",
      "seo",
    ];

    Object.entries(req.body).forEach(([key, value]) => {
      if (allowed.includes(key)) blog[key] = value;
    });

    if (req.body.title) {
      blog.slug = slugify(req.body.title, { lower: true, strict: true });
    }

    blog.updatedBy = req.user._id;
    await blog.save();

    res.json({ success: true, data: blog });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/* ============================
   🔴 DELETE BLOG
============================ */

export const destroyBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog)
      return res
        .status(404)
        .json({ success: false, message: "Blog not found" });

    if (blog.thumbnail) {
      const id = blog.thumbnail.split("/").pop().split(".")[0];
      await destroyFromCloudinary(`blog/thumbnails/${id}`);
    }

    for (const img of blog.gallery_images) {
      const id = img.split("/").pop().split(".")[0];
      await destroyFromCloudinary(`blog/gallery/${id}`);
    }

    await blog.deleteOne();
    res.json({ success: true, message: "Blog deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
