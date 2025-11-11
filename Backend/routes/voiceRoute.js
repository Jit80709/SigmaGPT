//  SigmaGPT — Final Deployment-Ready Voice Route (100% English Only)

// Features
//  Voice to Text (Whisper)
//  Text to AI English reply (GPT-4o-mini)
//  English Voice reply (TTS)
//  Fully works on localhost + Render
//  Auto folder create + cleanup

import express from "express";
import multer from "multer";
import fs from "fs";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

//  Ensure uploads folder exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// 🎙 Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/";
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

//  OpenAI setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Voice Route: /api/voice
router.post("/voice", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) throw new Error("No audio file received");

    // Step 1️: Transcribe English voice → text
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: "whisper-1",
      response_format: "text",
      language: "en", // Force English transcription only
    });

    const userText = (transcription || "").trim();
    console.log("🎙 User said:", userText || "[empty]");

    // Step 2️: Handle unclear audio
    if (!userText || userText.length < 2) {
      const fallback = "I couldn’t hear you clearly. Please say it again!";
      const fallbackFile = `uploads/fallback_${Date.now()}.mp3`;

      const tts = await openai.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice: "verse",
        input: fallback,
      });

      fs.writeFileSync(fallbackFile, Buffer.from(await tts.arrayBuffer()));

      return res.json({
        userText,
        text: fallback,
        language: "en",
        audioUrl: `${process.env.BASE_URL || "http://localhost:8080"}/${fallbackFile}`,
      });
    }

    // Step 3️: Get GPT reply (English only)
    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
            You are SigmaGPT, an intelligent AI assistant.
            The user always speaks English.
            Always understand and reply ONLY in English.
            Keep answers clear, concise, and natural.
          `,
        },
        { role: "user", content: userText },
      ],
    });

    const aiReply = chat.choices[0]?.message?.content || "Sorry, I didn’t understand.";
    console.log(" AI Reply:", aiReply);

    // Step 4️: Convert GPT reply → English Voice (TTS)
    const speechFile = `uploads/reply_${Date.now()}.mp3`;

    const tts = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "verse", // English natural voice
      input: aiReply,
    });

    fs.writeFileSync(speechFile, Buffer.from(await tts.arrayBuffer()));

    // Step 5️: Send final response
    res.json({
      userText,
      text: aiReply,
      language: "en",
      audioUrl: `${process.env.BASE_URL || "http://localhost:8080"}/${speechFile}`,
    });

    // Step 6️: Auto cleanup after 5s
    setTimeout(() => {
      fs.unlink(req.file.path, () => {});
    }, 5000);
  } catch (err) {
    console.error(" Voice Route Error:", err.message);
    if (err.response) {
      console.error(" OpenAI Response:", await err.response.text());
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;
