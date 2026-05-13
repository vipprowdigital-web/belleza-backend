import mongoose from "mongoose";

const { Schema, model } = mongoose;

const courseNames = [
  "Master in Cosmetology",
  "Diploma in Cosmetology",
  "Certificate in Cosmetology",
  "Certificate in Self Grooming",
  "Certificate in International Makeup Artistry",
  "Certificate in Professional Makeup Artistry",
  "Certificate in Makeup Artistry",
  "Certificate in International Nail Artistry",
  "Certificate in Professional Nail Artistry",
  "Certificate in Nail Artistry",
  "Certificate in Permanent Hair Extension",
  "Certificate in Barbering",
  "Certificate in International Hair Styling",
  "Certificate in Hair Styling",
  "Certificate in Professional Hair Craftsmanship",
  "Certificate in Hair Craftsmanship",
  "Certificate in Eye Lashes Extension",
  "Certificate in Aesthetician",
  "Certificate in Beauty Therapist",
  "Certificate in Skincare",
];

const courseCategories = ["combo", "makeup", "nails", "hair", "beauty"];

// ===============================================
// 🧩 Contact Us Schema (Supports Course & Franchise Forms)
// ===============================================
const contactUsSchema = new Schema(
  {
    // 🔖 Form Type
    // type: {
    //   type: String,
    //   required: true,
    //   enum: ["General", "Career", "Services", "other"],
    //   index: true,
    //   default: "General",
    // },

    // 👤 User Details
    name: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    // email: {
    //   type: String,
    //   required: [false, "Email is required"],
    //   lowercase: true,
    //   trim: true,
    //   match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    //   index: true,
    // },

    phone: {
      type: String,
      trim: true,
      default: null,
      match: [/^[0-9]{10,15}$/, "Invalid phone number format"],
    },

    // services: [
    //   {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: "Service",
    //   },
    // ],

    // subject: {
    //   type: String,
    //   trim: true,
    //   maxlength: 150,
    // },

    courseName: {
      type: String,
      enum: courseNames,
      required: true,
    },
    preferredLocation: {
      type: String,
      enum: ["rudrapur", "dehradun", "bajpur", "haldwani"],
      required: true,
    },

    message: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    // 🌐 Meta Info
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },

    // 🎯 Dynamic Fields (Course Inquiry + Franchise Form)
    // meta: {
    //   type: Map,
    //   of: Schema.Types.Mixed,
    //   default: {},
    // },

    // 🧍 Linked User (optional)
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // 🚦 Status
    status: {
      type: String,
      enum: ["new", "in_progress", "answered", "closed"],
      default: "new",
    },

    // 🧵 Admin Response
    response: {
      message: { type: String, trim: true, maxlength: 2000 },
      respondedBy: { type: Schema.Types.ObjectId, ref: "User" },
      respondedAt: { type: Date },
    },

    replies: [
      {
        message: { type: String, trim: true, maxlength: 2000 },
        respondedBy: { type: Schema.Types.ObjectId, ref: "User" },
        respondedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "contact_us",
  },
);

// ===============================================
// 🧠 Auto-update status on response
// ===============================================
contactUsSchema.pre("save", function (next) {
  if (this.response?.message && this.status !== "answered") {
    this.status = "answered";
    this.response.respondedAt = new Date();
  }
  next();
});

export default model("ContactUs", contactUsSchema);
