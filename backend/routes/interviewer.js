// backend/routes/interviewer.js
const express = require("express");
const auth = require("../middleware/authMiddleware"); // Using your corrected import path
const User = require("../models/User");
const Interview = require("../models/Interview");

const router = express.Router();

// --- 1. SCOREBOARD (List of Completed Interviews) ---
/**
 * GET /api/interviewer/scoreboard
 * Returns a list of all completed interviews, showing score and summary.
 */
router.get("/scoreboard", auth(["interviewer"]), async (req, res) => {
    try {
        const scoreboard = await Interview.find({ status: "completed" })
            .populate("candidate", "name email") // Get candidate name/email
            .select("candidate totalScore summary createdAt"); // Select score and summary fields

        res.json({ scoreboard });
    } catch (err) {
        console.error("Error fetching scoreboard:", err);
        res.status(500).json({ message: "Error fetching scoreboard", error: err.message });
    }
});


// --- 2. INTERVIEW DETAILS (Full Report) ---
/**
 * GET /api/interviewer/interview-details/:interviewId
 * Get specific candidate's full interview doc (for detailed review).
 */
router.get("/interview-details/:interviewId", auth(["interviewer"]), async (req, res) => {
    try {
        const interview = await Interview.findById(req.params.interviewId)
            .populate("candidate", "name email role");
            
        if (!interview) {
            return res.status(404).json({ message: "Interview not found" });
        }
        
        // Remove the large resumeText from the response to save bandwidth
        const interviewResponse = interview.toObject();
        delete interviewResponse.resumeText;

        res.json({ interview: interviewResponse });
    } catch (err) {
        console.error("Error fetching interview details:", err);
        res.status(500).json({ message: "Error fetching interview details", error: err.message });
    }
});


// --- 3. RESUME VIEW (Raw Text) ---
/**
 * GET /api/interviewer/resume/:interviewId
 * Get the original resume text for review.
 */
router.get("/resume/:interviewId", auth(["interviewer"]), async (req, res) => {
    try {
        const interview = await Interview.findById(req.params.interviewId).select("resumeText");
            
        if (!interview || !interview.resumeText) {
            return res.status(404).json({ message: "Resume text not found" });
        }
        
        // Return it as plain text for easy display on the frontend
        res.type('text/plain').send(interview.resumeText);
        
    } catch (err) {
        console.error("Error fetching resume:", err);
        res.status(500).json({ message: "Error fetching resume content", error: err.message });
    }
});


// --- 4. LIST CANDIDATES (Your Existing Route) ---
/**
 * GET /api/interviewer/candidates
 * Return list of candidates (no passwords)
 */
router.get("/candidates", auth(["interviewer"]), async (req, res) => {
    try {
        const candidates = await User.find({ role: "candidate" }).select("-password");
        res.json({ candidates });
    } catch (err) {
        res.status(500).json({ message: "Error fetching candidates", error: err.message });
    }
});


// --- 5. SET/OVERWRITE QUESTIONS (Your Existing Route + Improvement) ---
/**
 * POST /api/interviewer/questions/:candidateId
 * Interviewer can set/overwrite interview questions for a candidate.
 * IMPORTANT: This assumes the input `questions` array matches the schema
 * (e.g., includes 'question', 'difficulty', and 'timeLimit').
 */
router.post("/questions/:candidateId", auth(["interviewer"]), async (req, res) => {
    try {
        const { questions } = req.body;
        
        if (!Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ message: "Questions must be a non-empty array" });
        }
        
        // IMPROVEMENT: Ensure the difficulty/time fields are present if manually set
        const isValidQuestionFormat = questions.every(q => q.question && q.difficulty && q.timeLimit);
        if (!isValidQuestionFormat) {
             return res.status(400).json({ message: "Each question must contain 'question', 'difficulty', and 'timeLimit'" });
        }

        let interview = await Interview.findOne({ candidate: req.params.candidateId });
        
        if (!interview) {
            // Create a new interview document
            interview = new Interview({
                candidate: req.params.candidateId,
                interviewer: req.user._id, // Assign the interviewer who set the questions
                questions: questions,
                status: "pending"
            });
        } else {
            // Overwrite existing questions
            interview.questions = questions;
            interview.status = "pending"; // Reset status to pending for the new interview
            interview.interviewer = req.user._id; // Assign the current interviewer
        }

        await interview.save();

        res.json({ message: "Questions saved for candidate", interview });
    } catch (err) {
        console.error("Error saving questions:", err);
        res.status(500).json({ message: "Error saving questions", error: err.message });
    }
});

module.exports = router;