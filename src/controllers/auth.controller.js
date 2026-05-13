import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

// Register a New User

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      provider: "local",
    });

    res.status(201).json({
      message: "User registered successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
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

    return res.status(200).json({
      status: "success",
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
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
