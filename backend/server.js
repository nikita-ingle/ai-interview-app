const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const candidateRoutes = require("./routes/candidate");
const interviewerRoutes = require("./routes/interviewer");
const nodemailer = require("nodemailer");
// require("dotenv").config();
require("dotenv").config();
console.log("Loaded Gemini Key (first 10 chars):", process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) : "Key Not Found");

// Initialize app
const app = express();

// Middlewares
// app.use(cors());
app.use(cors({ origin: '*', credentials: true })); 
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/candidate", candidateRoutes);
app.use("/api/interviewer", interviewerRoutes);

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// Routes
app.get("/", (req, res) => {
  res.send("AI Interview App Backend Running ✅");
});

// Import authentication routes
// const authRoutes = require("./routes/auth");
// app.use("/auth", authRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
