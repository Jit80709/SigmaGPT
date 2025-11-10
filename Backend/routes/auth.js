
//  SigmaGPT Authentication Routes

// This file defines all authentication-related API endpoints.
// It connects frontend requests to controller logic.
// Includes: register, login, refresh token, logout, and get user info.


import express from "express";
import {
  register,       //  Controller for user registration
  login,          //  Controller for user login (JWT + cookies)
  refresh,        //  Controller for token refresh logic
  logout,         //  Controller for clearing cookies / session
  getCurrentUser, //  Controller to fetch current logged-in user details
} from "../controllers/authController.js";

import { verifyToken } from "../middleware/verifyToken.js"; //  JWT verification middleware

// Create Express router instance
const router = express.Router();


//  AUTH ROUTES


//  Get current user details (requires valid access token)
router.get("/me", verifyToken, getCurrentUser);

//  Register a new user (name, email, password)
router.post("/register", register);

//  Login existing user (returns access + refresh token in cookies)
router.post("/login", login);

//  Refresh expired access token (using refresh token)
router.post("/refresh", refresh);

//  Logout user (clears authentication cookies)
router.post("/logout", logout);


// Export router to be used in server.js

export default router;
