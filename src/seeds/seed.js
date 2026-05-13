/**
 * src/seeds/seed.js
 * Run: node src/seeds/seed.js
 *
 * WARNING: By default this script will NOT run when NODE_ENV=production.
 * Change behavior below if you want different behavior (like clearing DB).
 */

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { faker } from "@faker-js/faker";
import slugify from "slugify";
import bcrypt from "bcryptjs";
import path from "node:path";

// Adjust these imports to match your project file paths
import User from "../models/user.model.js";
import Category from "../models/blogs/category.model.js";
import Blog from "../models/blogs/blog.model.js";
import Comment from "../models/blogs/comment.model.js";
import Gallery from "../models/gallery.model.js";
import Testimonial from "../models/testimonial.model.js";
import Policy from "../models/policy.model.js";
import Service from "../models/service.model.js";
import ContactUs from "../models/contactus.model.js"; // change to your model path if different

// Config
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/blogdb";
const SAFE_TO_RUN = process.env.NODE_ENV !== "production";
const COUNTS = {
  users: 8,
  categories: 6,
  blogs: 20,
  commentsPerBlog: 4,
  testimonials: 6,
  gallery: 8,
  policies: 3,
  services: 6,
  contacts: 6,
};

if (!SAFE_TO_RUN) {
  console.error(
    "Refusing to run seeder in PRODUCTION. Set NODE_ENV!==production to proceed."
  );
  process.exit(1);
}

const dbConnect = async () => {
  await mongoose.connect(MONGO_URI, { autoIndex: true });
  console.log("DB connected:", MONGO_URI);
};

const createAdminAndUsers = async () => {
  const adminEmail = "admin@example.com";
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    const hashed = await bcrypt.hash("password123", 10);
    admin = await User.create({
      name: "Admin User",
      email: adminEmail,
      password: hashed,
      provider: "local",
    });
    console.log("Admin created:", adminEmail);
  } else {
    console.log("Admin exists:", adminEmail);
  }

  // create random users
  const users = [admin];
  for (let i = 0; i < COUNTS.users - 1; i++) {
    const email = faker.internet.email().toLowerCase();
    let u = await User.findOne({ email });
    if (!u) {
      const hashed = await bcrypt.hash("password123", 10);
      u = await User.create({
        name: faker.person.fullName(),
        email,
        password: hashed,
        provider: "local",
      });
    }
    users.push(u);
  }
  return users;
};

const createCategories = async () => {
  const adminUser = await User.findOne();
  const total = 100000;
  const batchSize = 5000; // insert in smaller chunks
  let createdCount = 0;

  console.log(
    `🧱 Starting generation of ${total.toLocaleString()} categories...`
  );

  while (createdCount < total) {
    const nameSet = new Set();

    // 🧩 Generate unique names for current batch
    while (nameSet.size < batchSize) {
      nameSet.add(faker.commerce.department() + " " + faker.word.adjective());
    }

    const categoryDocs = Array.from(nameSet).map((name) => ({
      name,
      slug: slugify(name, { lower: true, strict: true }),
      description: faker.lorem.sentence(),
      createdBy: adminUser?._id || null,
    }));

    // 💾 Insert batch
    await Category.insertMany(categoryDocs, { ordered: false });
    createdCount += batchSize;

    console.log(
      `✅ Inserted ${createdCount.toLocaleString()}/${total.toLocaleString()} categories...`
    );
  }

  console.log(
    `🎉 Completed inserting all ${total.toLocaleString()} categories.`
  );
};

export default createCategories;

const createBlogs = async (users, categories) => {
  const blogs = [];
  for (let i = 0; i < COUNTS.blogs; i++) {
    const title = faker.lorem.sentence(faker.number.int({ min: 3, max: 8 }));

    const slug =
      slugify(title, { lower: true, strict: true }) +
      "-" +
      faker.string.alphanumeric(4);
    const author = faker.helpers.arrayElement(users);
    const category = faker.helpers.arrayElement(categories);

    let existing = await Blog.findOne({ slug });
    if (!existing) {
      const blog = await Blog.create({
        title,
        slug,
        category: category._id,
        short_description: faker.lorem.paragraph(),
        description: faker.lorem.paragraphs(2),
        thumbnail: `https://picsum.photos/seed/${faker.string.alphanumeric(
          8
        )}/800/600.jpg`,
        seo: {
          metaTitle: title,
          metaDescription: faker.lorem.sentence(),
          metaKeywords: ["test", "seed"],
        },
        createdBy: author._id,
      });
      blogs.push(blog);
    } else blogs.push(existing);
  }
  return blogs;
};

const createComments = async (users, blogs) => {
  const comments = [];
  for (const blog of blogs) {
    for (let i = 0; i < COUNTS.commentsPerBlog; i++) {
      const user = faker.helpers.arrayElement(users);
      const content = faker.lorem.sentences({ min: 1, max: 3 });
      const c = await Comment.create({
        blog: blog._id,
        user: user._id,
        content,
      });
      // create one nested reply sometimes
      if (Math.random() > 0.7) {
        const replyUser = faker.helpers.arrayElement(users);
        await Comment.create({
          blog: blog._id,
          user: replyUser._id,
          parentComment: c._id,
          content: faker.lorem.sentence(),
        });
      }
      comments.push(c);
    }
  }
  return comments;
};

const createTestimonials = async (users) => {
  const created = [];
  for (let i = 0; i < COUNTS.testimonials; i++) {
    const name = faker.person.fullName();
    const rating = faker.number.int({ min: 3, max: 5 });

    // ✅ Always generate valid image URL (ending in .jpg)
    const avatarUrl = `https://picsum.photos/seed/${faker.string.alphanumeric(
      8
    )}/200/200.jpg`;

    const t = await Testimonial.create({
      name,
      designation: faker.person.jobTitle(),
      description: faker.lorem.sentences(2),
      avatar: avatarUrl,
      rating,
      createdBy: faker.helpers.arrayElement(users)._id,
    });
    created.push(t);
  }
  return created;
};

const createGallery = async (users) => {
  const items = [];
  for (let i = 0; i < COUNTS.gallery; i++) {
    const g = await Gallery.create({
      title: faker.lorem.words(3),
      image: faker.image.urlLoremFlickr({ category: "nature" }),
      createdBy: faker.helpers.arrayElement(await User.find())._id,
    });
    items.push(g);
  }
  return items;
};

const createPolicies = async (users) => {
  const items = [];
  for (let i = 0; i < COUNTS.policies; i++) {
    const title =
      ["Privacy Policy", "Terms of Service", "Refund Policy"][i] ||
      faker.lorem.words(2);
    const slug = slugify(title, { lower: true, strict: true });
    let p = await Policy.findOne({ slug });
    if (!p) {
      p = await Policy.create({
        title,
        slug,
        description: faker.lorem.paragraphs(1),
        createdBy: faker.helpers.arrayElement(users)._id,
      });
    }
    items.push(p);
  }
  return items;
};

const createServices = async (users) => {
  const items = [];
  for (let i = 0; i < COUNTS.services; i++) {
    const thumbnailUrl = `https://picsum.photos/seed/${faker.string.alphanumeric(
      8
    )}/400/300.jpg`;

    const s = await Service.create({
      title: faker.commerce.productName(),
      subHeading: faker.commerce.productAdjective(),
      description: faker.lorem.paragraph(),
      thumbnail: thumbnailUrl, // ✅ valid .jpg URL
      createdBy: faker.helpers.arrayElement(users)._id,
    });

    console.log(`🛠️ Service saved: ${s.title} (${s._id})`);
    items.push(s);
  }
  return items;
};

const createContacts = async (users) => {
  const items = [];
  for (let i = 0; i < COUNTS.contacts; i++) {
    const u = faker.helpers.arrayElement(users);
    const c = await ContactUs.create({
      name: u.name,
      email: u.email,
      phone: `9${faker.string.numeric(9)}`,
      subject: faker.lorem.words(3),
      message: faker.lorem.sentences(2),
      ipAddress: faker.internet.ip(),
      userAgent: "faker-agent",
      createdBy: u._id,
    });
    items.push(c);
  }
  return items;
};

const run = async () => {
  try {
    await dbConnect();

    // NOTE: adjust or remove lines below if you want to clear DB before seeding.
    // await mongoose.connection.dropDatabase(); // uncomment to drop DB before seeding

    // const users = await createAdminAndUsers();
    const categories = await createCategories();
    // const blogs = await createBlogs(users, categories);
    // await createComments(users, blogs);
    // await createTestimonials(users);
    // await createGallery(users);
    // await createPolicies(users);
    // await createServices(users);
    // await createContacts(users);

    console.log("✅ Seeding completed.");
    process.exit(0);
  } catch (err) {
    console.error("Seeder error:", err);
    process.exit(1);
  }
};

run();
