import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Branch from "../models/branch.model.js";

// Register a New User

export const register = async (req, res) => {
  try {
    const { name, email, password, branchName, subdomain, customDomain } = req.body;

    // Validate all required fields
    if (!name || !email || !password || !branchName || !subdomain) {
      return res.status(400).json({ 
        message: "All fields are required (name, email, password, branchName, subdomain)." 
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Check if subdomain already exists
    const existingSubdomain = await Branch.findOne({ subdomain: subdomain.toLowerCase() });
    if (existingSubdomain) {
      return res.status(400).json({ message: "Subdomain already taken" });
    }

    // Note: Multiple admins can use the same custom domain, so we don't validate uniqueness for customDomain

    // Create a new branch
    const branch = await Branch.create({
      name: branchName,
      slug: branchName.toLowerCase().replace(/\s+/g, '-'),
      subdomain: subdomain.toLowerCase(),
      customDomain: customDomain || null,
    });

    // Hash password and create user with branchId
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      provider: "local",
      branchId: branch._id,
    });

    res.status(201).json({
      message: "User registered successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || null,
        provider: user.provider,
      },
      branch: {
        id: branch._id,
        name: branch.name,
        slug: branch.slug,
        subdomain: branch.subdomain,
        customDomain: branch.customDomain,
      },
    });
  } catch (error) {
    console.error("Register error:", error.message);
    res.status(500).json({ message: "Internal Server Error." });
  }
};

// Login User via email & password

export const login = async (req, res) => {
  try {
    console.log("📥 Incoming login payload:", req.body);
    let { email, password } = req.body;

    // Normalize email (avoid case sensitivity issues)
    email = email?.trim().toLowerCase();

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email and password are required.",
        field: !email ? "email" : "password",
      });
    }

    // Check user existence
    const user = await User.findOne({ email });

    // Generic error (avoid telling which field is incorrect for security)
    if (!user) {
      console.error("Login error: Invalid email or password for email e:", email);
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password.",
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.error("Login error: password match:", email);
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password.",
      });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Fetch branch information
    const branch = await Branch.findById(user.branchId);

    return res.status(200).json({
      status: "success",
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || null,
        provider: user.provider,
      },
      branch: branch ? {
        id: branch._id,
        name: branch.name,
        slug: branch.slug,
        subdomain: branch.subdomain,
        customDomain: branch.customDomain,
      } : null,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong. Please try again later.",
    });
  }
};

// -------------------------
// Logout user (JWT) - optimized
// -------------------------
export const logout = async (req, res) => {
  try {
    // If you want, implement token blacklist in DB/Redis for server-side invalidation
    return res.status(200).json({
      message:
        "Logout successful. Please remove the token from client storage.",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ message: "Internal Server Error." });
  }
};
