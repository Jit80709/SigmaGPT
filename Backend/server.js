
// Main entry point of the SigmaGPT backend server
// Handles Express setup, MongoDB connection, routes,
// and middleware configuration (CORS, cookies, etc.)

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";


//  Import all routes
import chatRoutes from "./routes/chat.js";
import authRoutes from "./routes/auth.js";
import voiceRoute from "./routes/voiceRoute.js"; //  Voice input route

//  Load environment variables
dotenv.config();
//  Initialize Express app
const app = express();


//  Add this for Render proxy and cookies (important)
app.set("trust proxy", 1);

//  Middleware Setup

// - express.json() → parses incoming JSON requests
// - cookieParser() → enables reading cookies
// - static() → serves uploaded voice/audio files

app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static("uploads")); //  Serve generated audio files


//  CORS Configuration

// Allows the React frontend (localhost:5173) to communicate
// securely with the backend including cookies & headers
const allowedOrigin = process.env.CLIENT_URL || "http://localhost:5173";
app.use(
  cors({
    origin: allowedOrigin,  // React frontend URL
    credentials: true, // allow cookies across domains
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


//  MongoDB Connection

// Connects to the MongoDB database (name: sigmagpt)

mongoose
  .connect(process.env.MONGO_URI, { dbName: "sigmagpt" })
  .then(() => console.log(" MongoDB connected"))
  .catch((err) => console.error(" MongoDB connect error:", err.message));


//  API Routes

// /api/auth  → Authentication routes (login, register, etc.)
// /api       → Chat and message routes
// /api/voice → Voice recognition & TTS routes

app.use("/api/auth", authRoutes);
app.use("/api", chatRoutes);
app.use("/api", voiceRoute); //  Integrated voice assistant route


//  Debug Route (for cookie inspection)

// Helps during development to verify stored cookies

app.get("/api/debug-cookies", (req, res) => {
  res.json({ cookies: req.cookies || {} });
});


//  Health Check Route

// Simple route to verify if backend is up & running

/*app.get("/", (req, res) => res.send(" SigmaGPT Backend is running..."));*/
/*app.get("/", (req, res) => res.send(" SigmaGPT Backend is running..."));*/


//  Serve React frontend (Render one-link deploy)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Important: build folder is inside Backend/dist
const frontendPath = path.join(__dirname, "dist");

//  Serve static files
app.use(express.static(frontendPath));

//  Handle React Router routes
app.get(/.*/, (req, res) => {
  res.sendFile(path.resolve(frontendPath, "index.html"));
});

// Launches Express app on PORT (default: 8080)

const PORT = process.env.PORT || 8080;
app.listen(PORT,"0.0.0.0", () => console.log(` Server running on port ${PORT}`));
