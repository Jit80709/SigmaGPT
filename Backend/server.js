//  SigmaGPT — Final One-Link Deployment Version (Frontend + Backend + Voice + Auth)
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
app.set("trust proxy", 1);

// Middleware
app.use(express.json());
app.use(cookieParser());

// Serve uploads folder
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

//  UNIVERSAL CORS (Local + Render + Self)
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.BASE_URL, // <-- add this line
  "https://sigmagpt-backend-lkc4.onrender.com", // <-- direct self URL
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.warn(" Blocked CORS request from:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());

//  MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, { dbName: "sigmagpt" })
  .then(() => console.log(" MongoDB Connected"))
  .catch((err) => console.error(" MongoDB Error:", err.message));

//  API Routes
app.use("/api/auth", authRoutes);
app.use("/api", chatRoutes);
app.use("/api", voiceRoute);

//  Serve Frontend (React Vite build)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, "../frontend/dist");

app.use(express.static(frontendPath));

//  Health route (use /api/health to avoid conflict)
app.get("/api/health", (req, res) => {
  res.json({ status: " SigmaGPT Backend Running" });
});

// ⚡️ Serve React for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.resolve(frontendPath, "index.html"));
});

//  Global Error Handler
app.use((err, req, res, next) => {
  console.error(" Server Error:", err.message);
  res.status(500).json({ error: "Internal Server Error" });
});

//  Start Server
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(` SigmaGPT Live on Port: ${PORT}`);
  console.log(` Client URL: ${process.env.CLIENT_URL}`);
  console.log(` Base URL: ${process.env.BASE_URL}`);
});
