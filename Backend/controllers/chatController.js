
// Handles all chat-related functionalities:
//   Sending user messages to OpenAI API
//   Storing message history in MongoDB
//   Managing threads and their related messages


import Message from "../models/Message.js";   // Mongoose model for chat messages
import Thread from "../models/Thread.js";     // Mongoose model for chat threads

// OpenAI Chat Completion API endpoint
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";


//  SEND MESSAGE CONTROLLER

// Handles sending a user's message to OpenAI API:
// 1️ Saves user message in MongoDB
// 2️ Sends it to OpenAI GPT model for response
// 3️ Saves AI's reply to database
// 4️ Ensures the thread exists or creates a new one

export const sendMessage = async (req, res) => {
  try {
    const { message, threadId } = req.body;

    //  Validate required input
    if (!message || !threadId) {
      return res.status(400).json({ message: "Message and threadId required" });
    }

    const userId = req.user.userId;

    // 1️ Save user's message into the database
    const userMsg = await Message.create({
      userId,
      threadId,
      role: "user",
      content: message,
    });

    // 2️ Prepare OpenAI API request payload
    const payload = {
      model: "gpt-4o-mini", // OpenAI GPT model used for chat
      messages: [{ role: "user", content: message }],
      max_tokens: 800,      // Maximum tokens for AI response
      temperature: 0.2,     // Controls creativity of response
    };

    // 3️ Send request to OpenAI API
    const openaiRes = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    //  Handle OpenAI API failure
    if (!openaiRes.ok) {
      const error = await openaiRes.json();
      console.error("OpenAI Error:", error);
      return res.status(500).json({ message: "OpenAI API error", error });
    }

    // 4️ Extract AI response from OpenAI output
    const data = await openaiRes.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || " No reply";

    // 5️ Save AI assistant reply in the database
    const botMsg = await Message.create({
      userId,
      threadId,
      role: "assistant",
      content: reply,
    });

    // 6️ Ensure the thread exists, or create it for sidebar
    let thread = await Thread.findOne({ threadId, userId });
    if (!thread) {
      const title = message.split(" ").slice(0, 5).join(" "); // Generate short title
      thread = await Thread.create({ threadId, title, userId });
    }

    //  Return both user + assistant messages
    res.json({ reply, history: [userMsg, botMsg] });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ message: "Chat error" });
  }
};


//  GET CHAT HISTORY (By Thread)
// 
// Fetches all chat messages for a given threadId,
// specific to the logged-in user.

export const getHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { threadId } = req.params;

    // Find messages belonging to this user & thread
    const messages = await Message.find({ userId, threadId }).sort({
      timestamp: 1, // Sort oldest to newest
    });

    if (!messages.length) {
      return res.status(404).json({ message: "No messages found for this thread" });
    }

    res.json(messages);
  } catch (err) {
    console.error("History error:", err);
    res.status(500).json({ message: "History fetch error" });
  }
};

// 
//  GET ALL THREADS (User-Specific)
// ------------------------------------------------------
// Fetches all chat threads created by a particular user,
// sorted in descending order of creation.
// 
export const getThreads = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Find all threads belonging to the current user
    const threads = await Thread.find({ userId }).sort({ createdAt: -1 });
    res.json(threads);
  } catch (err) {
    console.error("Get threads error:", err);
    res.status(500).json({ message: "Failed to fetch threads" });
  }
};


//  GET THREAD BY ID
// Retrieves a single thread and its messages
// for the authenticated user.
export const getThreadById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { threadId } = req.params;

    //  Find the thread in DB
    const thread = await Thread.findOne({ threadId, userId });
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    //  Retrieve all messages of that thread
    const messages = await Message.find({ threadId, userId }).sort({
      timestamp: 1,
    });

    res.json(messages);
  } catch (err) {
    console.error("Get thread error:", err);
    res.status(500).json({ message: "Failed to fetch thread" });
  }
};


//  DELETE THREAD

// Deletes a particular thread along with all messages
// belonging to that user and thread.

export const deleteThread = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { threadId } = req.params;

    // Delete the thread document
    const thread = await Thread.findOneAndDelete({ threadId, userId });
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    // Delete all related messages
    await Message.deleteMany({ threadId, userId });

    res.json({ message: "Thread deleted successfully" });
  } catch (err) {
    console.error("Delete thread error:", err);
    res.status(500).json({ message: "Failed to delete thread" });
  }
};



//  CREATE THREAD

// Creates a new chat thread manually.
// Used to persist empty threads in sidebar before chatting
export const createThread = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { threadId, title } = req.body;

    // Validate input
    if (!threadId || !title) {
      return res.status(400).json({ message: "ThreadId and title required" });
    }

    // Check if the thread already exists, else create it
    let thread = await Thread.findOne({ threadId, userId });
    if (!thread) {
      thread = await Thread.create({ threadId, title, userId });
    }

    res.status(201).json(thread);
  } catch (err) {
    console.error("Create thread error:", err);
    res.status(500).json({ message: "Failed to create thread" });
  }
};
