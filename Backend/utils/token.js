
// Utility functions to generate secure JWT tokens
//   Access Token → short-lived (for quick validation)
//  Refresh Token → long-lived (for session renewal)


import jwt from "jsonwebtoken";


//  Generate Access Token (Valid for 15 minutes)

// Used for authorizing protected routes (quick expiry)

export const generateAccessToken = (user) => {
  try {
    return jwt.sign(
      {
        userId: user._id,  // Unique user ID
        role: user.role,   // User role (user/admin)
      },
      process.env.ACCESS_TOKEN_SECRET || "accesssecret", // Secret key (fallback for dev)
      { expiresIn: "15m" } // Token lifespan: 15 minutes
    );
  } catch (err) {
    console.error(" AccessToken generation error:", err.message);
    throw err;
  }
};


// Generate Refresh Token (Valid for 7 days)

// Used for generating a new Access Token when expired
// Longer expiry keeps user logged in securely

export const generateRefreshToken = (user) => {
  try {
    return jwt.sign(
      {
        userId: user._id,       // Unique user ID
        tokenType: "refresh",   // Identify this as a refresh token
      },
      process.env.REFRESH_TOKEN_SECRET || "refreshsecret", // Secret key (fallback for dev)
      { expiresIn: "7d" } // Token lifespan: 7 days
    );
  } catch (err) {
    console.error(" RefreshToken generation error:", err.message);
    throw err;
  }
};
