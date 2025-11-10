
// Mongoose schema for user authentication and management
// Stores basic user info like name, email, password, and role


import mongoose from "mongoose";

//  User Schema
const UserSchema = new mongoose.Schema(
  {
    //  User's full name
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    //  Unique email address (used for login)
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [/.+\@.+\..+/, "Please enter a valid email address"], // Basic format validation
    },

    //  Encrypted password (stored after bcrypt hashing)
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
    },

    //  User role - can be 'user' or 'admin'
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  { timestamps: true } // Adds createdAt & updatedAt automatically
);

//  Index email field for faster login/search queries
UserSchema.index({ email: 1 });

// Export the User model
export default mongoose.model("User", UserSchema);
