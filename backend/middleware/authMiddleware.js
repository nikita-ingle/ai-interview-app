// backend/middleware/auth.js
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");

module.exports = function authMiddleware(allowedRoles = []) {
  // allowedRoles can be [] (no role check), or ["candidate"], or ["interviewer"], or ["candidate","interviewer"]
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "mysecretkey");

      // Get full user from DB (no password)
      const userId = new mongoose.Types.ObjectId(decoded.id);
      const user = await User.findById(userId).select("-password");
      if (!user) { 
          // If the lookup fails for any reason (even if ID is correct)
          throw new Error("User ID found in token does not exist in DB.");
      }
      // if (!user) return res.status(401).json({ message: "User not found" });

      // Role check if roles specified
      if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
        if (!allowedRoles.includes(user.role)) {
          return res
            .status(403)
            .json({ message: "Forbidden: Insufficient role" });
        }
      }

      // attach user to request for handlers
      req.user = user;
      next();
    } catch (err) {
      console.error("Auth error:", err.message || err);
      return res
        .status(401)
        .json({ message: "TOKEN REJECTED or USER NOT FOUND" });
    }
  };
};
