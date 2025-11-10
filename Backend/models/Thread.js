

// Mongoose schema for storing user-specific chat threads
// Each thread represents one complete conversation.


import mongoose from "mongoose";

//  Thread Schema
const ThreadSchema = new mongoose.Schema(
  {
    // Unique ID for each thread (used to link messages)
    threadId: {
      type: String,
      required: true,
      unique: true, // No two threads can have the same ID
    },

    // Short title for the thread (shown in sidebar)
    title: {
      type: String,
      required: true,
      trim: true,
    },

    // Reference to the user who owns this thread
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // Each thread belongs to one user
    },
  },
  { timestamps: true } // Automatically adds createdAt & updatedAt
);

//  Index for faster query by user and creation time
ThreadSchema.index({ userId: 1, createdAt: -1 });

// Export Thread model
export default mongoose.model("Thread", ThreadSchema);
