
//  SigmaGPT — Chat & Thread Routes

// This file defines all routes related to chat messages
// and conversation threads.
// Features include:
//   Sending messages (with GPT response)
//  Fetching message history
//   Managing threads (create, fetch, delete)
//  Clearing all chat history for a user


import express from "express";
import { verifyToken } from "../middleware/verifyToken.js"; //  Auth middleware
import {
  sendMessage,   //  Handles sending message to GPT and saving response
  getHistory,    //  Returns message history of a given thread
  getThreads,    //  Fetches all conversation threads for user
  getThreadById, //  Fetches a specific thread by threadId
  deleteThread,  //  Deletes a specific thread
  createThread,  //  Creates a new thread
} from "../controllers/chatController.js";

import Thread from "../models/Thread.js";

const router = express.Router();


//  CHAT ROUTES

// /api/chat → Send message to GPT + Save reply
// /api/history/:threadId → Get all messages from a thread


//  Send a message to GPT and save to DB
router.post("/chat", verifyToken, sendMessage);

//  Get message history for a specific thread
router.get("/history/:threadId", verifyToken, getHistory);


// CLEAR ALL THREADS (for the current logged-in user)

// This route deletes *all chat threads* for the user.
// It’s kept ABOVE dynamic routes (like :threadId) to prevent conflicts.

router.delete("/thread/clear", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID missing in token",
      });
    }

    // Delete all threads belonging to this user
    const result = await Thread.deleteMany({ userId });
    console.log(`🧹 Cleared ${result.deletedCount} threads for user: ${userId}`);

    return res.json({
      success: true,
      message: " All chats cleared successfully.",
    });
  } catch (error) {
    console.error("❌ Error clearing chats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to clear chats.",
    });
  }
});


//  THREAD ROUTES

// /api/thread → Get or Create thread list
// /api/thread/:threadId → Get or Delete single thread

//  Fetch all threads for current user
router.get("/thread", verifyToken, getThreads);

//  Create a new thread (for sidebar persistence)
router.post("/thread", verifyToken, createThread);

//  Fetch messages from specific thread
router.get("/thread/:threadId", verifyToken, getThreadById);

//  Delete a specific thread
router.delete("/thread/:threadId", verifyToken, deleteThread);


//  Export router for use in server.js

export default router;
