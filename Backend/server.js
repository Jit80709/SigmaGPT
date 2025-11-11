//  SigmaGPT — Final Voice + Chat Deployment-Ready Server
//  Supports: Voice Recognition (Whisper) + GPT Reply + TTS + Auth + CORS Fix
//  Works on localhost and Render deployment without modification

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Import Routes
import chatRoutes from "./routes/chat.js";
import authRoutes from "./routes/auth.js";
import voiceRoute from "./routes/voiceRoute.js";

// Load environment variables
dotenv.config();

// Ensure uploads folder exists (to avoid crash)
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Initialize Express
const app = express();

// Trust proxy (important for Render + cookies)
app.set("trust proxy", 1);

// Middleware
app.use(express.json());
app.use(cookieParser());

// Serve voice/audio files publicly
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

//  UNIVERSAL CORS FIX (Works both locally and on Render)
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow Postman or curl (no origin)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.warn(" Blocked CORS request from:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

//  Handle CORS Preflight Requests
app.options("*", cors());

//  MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, { dbName: "sigmagpt" })
  .then(() => console.log(" MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err.message));

//  API Routes
app.use("/api/auth", authRoutes);
app.use("/api", chatRoutes);
app.use("/api", voiceRoute);

//  Health Check Route
app.get("/", (req, res) => {
  res.json({ status: " SigmaGPT Backend Running" });
});

//  Serve React Frontend (Vite build) for deployment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, "../frontend/dist");

app.use(express.static(frontendPath));
app.get("*", (req, res) => {
  res.sendFile(path.resolve(frontendPath, "index.html"));
});

//  Global Error Handler (prevents 500 crash)
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err.message);
  res.status(500).json({ error: "Internal Server Error" });
});

//  Start Server with Auto-Port Fallback (Safe for Render)
const PORT = process.env.PORT || 8080;

const startServer = (port) => {
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(` SigmaGPT Backend running on port ${port}`);
    console.log(` Client URL: ${process.env.CLIENT_URL}`);
    console.log(` Base URL: ${process.env.BASE_URL}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.log(` Port ${port} busy. Trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error(" Server Error:", err);
    }
  });
};

startServer(PORT);
