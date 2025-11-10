
// Mongoose Schema for storing individual chat messages
// Each message belongs to a specific user and thread.


import mongoose from "mongoose";


//  Message Schema Definition

// Fields:
//  userId: The user who sent or received the message
//  threadId: Unique conversation ID (used to group related messages)
//   role: Defines if message is from user or assistant
//   content: The actual text of the message

// Notes:
//  timestamps true automatically adds createdAt & updatedAt
//  index improves query speed on threadId-based lookups

const MessageSchema = new mongoose.Schema(
  {
    //  Reference to the user who owns the message
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",     // Reference to User collection
      required: true,
    },

    //  Unique thread ID for grouping messages
    threadId: {
      type: String,
      required: true,
      index: true,      // Optimizes queries by threadId
    },

    //  Message role: either user or assistant
    role: {
      type: String,
      enum: ["user", "assistant"], // Restrict values for data integrity
      required: true,
    },

    //  The main message content
    content: {
      type: String,
      required: true,
      trim: true,       // Removes leading/trailing spaces
    },
  },
  { timestamps: true }  // Adds createdAt and updatedAt automatically
);


//  Index Optimization

// This ensures faster data retrieval for chat histories.

MessageSchema.index({ userId: 1, threadId: 1, createdAt: 1 });


//  Model Export

// Exports the compiled Message model for use in controllers

export default mongoose.model("Message", MessageSchema);
