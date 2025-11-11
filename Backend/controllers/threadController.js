
// Handles all chat thread operations:
//   Fetch all threads for a user
//   Fetch messages for a specific thread
//   Delete a thread and its related messages


import Thread from "../models/Thread.js";   // Mongoose model for chat threads
import Message from "../models/Message.js"; // Mongoose model for chat messages


//  GET ALL THREADS (User-Specific)

// Fetches all chat threads that belong to the logged-in user.
// Sorted by creation date (newest first).

export const getThreads = async (req, res) => {
  try {
    //  Find all threads for the logged-in user
    const threads = await Thread.find({ userId: req.user.userId }).sort({
      createdAt: -1, // Newest threads appear first
    });

    //  Send thread list to client
    res.json(threads);
  } catch (err) {
    console.error("Thread fetch error:", err);
    res.status(500).json({ message: "Error fetching threads" });
  }
};


//  GET THREAD BY ID

// Fetches all messages from a specific thread,
// filtered by user (ensures no cross-user data leakage).

export const getThreadById = async (req, res) => {
  try {
    const { threadId } = req.params;
    const userId = req.user.userId;

    //  Retrieve all messages for a given thread ID and user
    const messages = await Message.find({ threadId, userId }).sort({
      timestamp: 1, // Sort messages from oldest to newest
    });

    //  If no messages found, return 404
    if (!messages.length) {
      return res.status(404).json({ message: "No messages found for this thread" });
    }

    //  Return messages for the selected thread
    res.json(messages);
  } catch (err) {
    console.error("Thread messages error:", err);
    res.status(500).json({ message: "Error fetching thread messages" });
  }
};


//  DELETE THREAD

// Deletes a specific thread and all of its related messages.
// Used when user clears chat or deletes a conversation.

export const deleteThread = async (req, res) => {
  try {
    const threadId = req.params.threadId?.trim();
    const userId = req.user?.userId;

    //  Authorization check
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized: missing user info" });
    }

    //  Find and delete thread
    const thread = await Thread.findOneAndDelete({ threadId, userId });

    if (!thread) {
      return res.status(404).json({ success: false, message: "Thread not found or not owned by user" });
    }

    //  Delete all related messages
    const deletedMessages = await Message.deleteMany({ threadId, userId });

    console.log(` Thread deleted: ${threadId}, Messages removed: ${deletedMessages.deletedCount}`);

    //  Send structured response
    return res.status(200).json({
      success: true,
      message: "Thread deleted successfully",
      threadId,
      deletedMessages: deletedMessages.deletedCount,
    });

  } catch (err) {
    console.error(" Delete thread error:", err);
    return res.status(500).json({
      success: false,
      message: "Error deleting thread",
      error: err.message,
    });
  }
};
