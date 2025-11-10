
// Middleware function that verifies the user's JWT access token.
// Ensures that only authenticated users can access protected routes.
// Works with both cookies and "Authorization" header.


import jwt from "jsonwebtoken";


//  verifyToken Middleware

// 1️ Checks for access token (from cookies or headers)
// 2️ Verifies the token using JWT secret key
// 3️ Attaches decoded user info to req.user
// 4️ Calls next() to allow access if token is valid

export const verifyToken = (req, res, next) => {
  try {
    //  Retrieve token from cookies first
    let token = req.cookies?.accessToken;

    //  Fallback: check for "Authorization: Bearer <token>" header
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    //  If no token is provided, block the request
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    try {
      //  Verify the token using the secret key
      const payload = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET || "accesssecret"
      );

      //  Attach decoded user details to request object
      req.user = {
        userId: payload.userId,
        email: payload.email,
        name: payload.name,
      };

      //  Continue to the next middleware or route
      next();
    } catch (err) {
      //  Token verification failed — invalid or expired token
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  } catch (err) {
    console.error("verifyToken error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
