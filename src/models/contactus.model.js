import mongoose from "mongoose";

const { Schema, model } = mongoose;

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

    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
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

    // Branch Link
    branchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: true, 
    }
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
