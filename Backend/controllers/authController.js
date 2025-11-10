
// Handles all authentication-related operations:
// Registration, Login, Token Refresh, Logout, and Get Current User.
// Uses JWT for authentication and cookies for secure token storage.
// 

import bcrypt from "bcryptjs";               // For securely hashing passwords
import jwt from "jsonwebtoken";              // For generating and verifying tokens
import User from "../models/User.js";        // MongoDB user model
import { generateAccessToken, generateRefreshToken } from "../utils/token.js";









//  Cookie Configuration
// Different cookie options for Development vs Production
const isProd = process.env.NODE_ENV === "production";

const ACCESS_OPTIONS = {
  httpOnly: true,                             // Prevent JS access (for security)
  secure: isProd,                             // HTTPS only in production
  sameSite: isProd ? "None" : "Lax",          // Cross-site cookie support
  path: "/",                                  // Available across all routes
};

const REFRESH_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "None" : "Lax",
  path: "/",
};


//  REGISTER Controller


// Registers a new user:
// - Validates required fields
// - Checks for existing email
// - Hashes password securely using bcrypt
// - Generates Access + Refresh JWT tokens
// - Stores tokens in cookies


export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    //  Check if all required fields are provided
    if (!name || !email || !password)
      return res.status(400).json({ message: "Missing fields" });

    //  Check if the email already exists
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already registered" });

    //  Hash the user's password before saving
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, role: "user" });

    //  Generate access and refresh tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    //  Store tokens in cookies
    res.cookie("accessToken", accessToken, ACCESS_OPTIONS);
    res.cookie("refreshToken", refreshToken, REFRESH_OPTIONS);

    //  Return success response
    res.json({
      message: "✅ Registration successful",
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// LOGIN Controller

// Logs in an existing user
//  Validates credentials
//  Compares password hash using bcrypt
// Generates and stores new JWT tokens in cookies


export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    //  Check for missing credentials
    if (!email || !password) return res.status(400).json({ message: "Missing fields" });

    //  Find user by email
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    //  Compare provided password with stored hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    //  Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    //  Store tokens in cookies
    res.cookie("accessToken", accessToken, ACCESS_OPTIONS);
    res.cookie("refreshToken", refreshToken, REFRESH_OPTIONS);

    //  Respond with user data
    res.json({
      message: " Login successful",
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


//  REFRESH Controller


// Refreshes JWT tokens when access token expires:
//  Validates refresh token from cookies
//  Generates new access and refresh tokens
//  Updates cookies with new tokens



export const refresh = async (req, res) => {
  try {
    //  Retrieve refresh token from cookies
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ message: "No refresh token" });

    //  Verify refresh token validity
    const payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET || "refreshsecret");

    //  Find the user from decoded payload
    const user = await User.findById(payload.userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    //  Generate new tokens
    const accessToken = generateAccessToken(user);
    const newRefresh = generateRefreshToken(user);

    //  Set new tokens in cookies
    res.cookie("accessToken", accessToken, ACCESS_OPTIONS);
    res.cookie("refreshToken", newRefresh, REFRESH_OPTIONS);

    //  Send success response
    res.json({
      message: " Token refreshed",
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Refresh error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


//  LOGOUT Controller

// Logs out the user by clearing access and refresh cookies

export const logout = (req, res) => {
  res.clearCookie("accessToken", { path: "/" });
  res.clearCookie("refreshToken", { path: "/" });
  res.json({ message: "Logged out" });
};


//  GET CURRENT USER Controller

// Fetches the currently authenticated user's data:
//  Requires valid access token (decoded by middleware)
//  Returns basic user info without password

export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    //  Fetch user data excluding password
    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    //  Return user profile info
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    console.error("getCurrentUser error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
