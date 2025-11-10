
//  SigmaGPT Voice Route (Final Stable)

// Pipeline: Voice → Whisper (STT) → GPT → TTS → JSON Response
//  Auto language detection: English  Bengali  Hindi
//  Fix: English question no longer triggers wrong language
//  Clean fallback for unclear input


import express from "express";
import multer from "multer";
import fs from "fs";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();


// ⚙️ MULTER SETUP

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });


//  OpenAI Initialization

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

//  Improved Language Detection Function
function detectLanguage(text = "") {
  const bnRegex = /[\u0980-\u09FF]/;
  const hiRegex = /[\u0900-\u097F]/;
  const englishRatio =
    (text.match(/[a-zA-Z]/g)?.length || 0) / (text.length || 1);

  if (bnRegex.test(text)) return "bn";
  if (hiRegex.test(text)) return "hi";
  if (englishRatio > 0.6) return "en"; // mostly English text
  return "en"; // default fallback
}


//  POST /api/voice

router.post("/voice", upload.single("audio"), async (req, res) => {
  try {
    console.log("🎧 Voice received:", req.file?.filename);

    if (!process.env.OPENAI_API_KEY)
      throw new Error(" Missing OpenAI API Key");
    if (!req.file) throw new Error(" No audio file received");

    if (!req.file.mimetype.includes("webm")) {
      req.file.mimetype = "audio/webm; codecs=opus";
    }

    // 1️ Speech → Text (Whisper)
    let transcription;
    try {
      transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(req.file.path),
        model: "whisper-1",
      });
    } catch (err) {
      console.error(" Whisper failed:", err.message);
      transcription = { text: "" };
    }

    const userText = (transcription.text || "").trim();
    console.log(" User said:", userText || "[EMPTY TRANSCRIPTION]");

    // 2️ Language Detection (Improved)
    const detectedLang = detectLanguage(userText);
    console.log(" Detected Language:", detectedLang);

    // 3️ Empty / unclear input
    if (!userText || userText.length < 2) {
      const fallbackText =
        detectedLang === "bn"
          ? "আমি তোমার কথা ঠিক বুঝতে পারিনি, আবার বলো।"
          : detectedLang === "hi"
          ? "मुझे तुम्हारी बात ठीक से समझ नहीं आई, कृपया फिर से कहो।"
          : "I couldn’t hear you clearly. Please try again!";

      const fallbackAudio = `uploads/reply_${Date.now()}_fallback.mp3`;
      const ttsResponse = await openai.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice: "alloy",
        input: fallbackText,
      });
      const buffer = Buffer.from(await ttsResponse.arrayBuffer());
      fs.writeFileSync(fallbackAudio, buffer);

      return res.json({
        userText,
        text: fallbackText,
        language: detectedLang,
        audioUrl: `http://localhost:${process.env.PORT || 8080}/${fallbackAudio}`,
      });
    }

    // 4️ GPT Reply Generation
    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
            You are SigmaGPT — a multilingual AI assistant.
            The user's detected language is "${detectedLang}".
            - If English, reply in English.
            - If Bengali, reply in Bengali.
            - If Hindi, reply in Hindi.
            Always match the user's language unless explicitly changed.
            Keep replies short, natural, and friendly.
          `,
        },
        { role: "user", content: userText },
      ],
      temperature: 0.7,
    });

    const aiReply =
      chatCompletion.choices?.[0]?.message?.content ||
      (detectedLang === "bn"
        ? "দুঃখিত, আমি বুঝতে পারিনি। আবার বলো।"
        : detectedLang === "hi"
        ? "माफ़ कीजिए, मैं समझ नहीं पाया।"
        : "I'm sorry, I couldn’t understand. Please try again.");

    console.log(" SigmaGPT:", aiReply);

    // 5️ Text → Speech (TTS)
    const speechFile = `uploads/reply_${Date.now()}.mp3`;
    const ttsResponse = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: aiReply,
    });
    const buffer = Buffer.from(await ttsResponse.arrayBuffer());
    fs.writeFileSync(speechFile, buffer);

    // 6 Send to Frontend
    res.json({
      userText,
      text: aiReply,
      language: detectedLang,
      audioUrl: `http://localhost:${process.env.PORT || 8080}/${speechFile}`,
    });

    // 7️ Cleanup
    setTimeout(() => {
      fs.unlink(req.file.path, (err) => {
        if (err) console.warn("⚠️ Cleanup failed:", err.message);
      });
    }, 2000);
  } catch (err) {
    console.error(" Voice Route Error:", err);
    res.status(500).json({
      error: err.message || "Internal Server Error",
    });
  }
});

export default router;
