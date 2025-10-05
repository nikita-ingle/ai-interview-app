const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const Interview = require("../models/Interview");
const multer = require("multer");
const fs = require("fs");
const { generateQuestionsFromResume, evaluateAnswer, generateSummary } = require("../utils/gemini"); 
const nodemailer = require("nodemailer");
const { PdfReader } = require('pdfreader'); // Stable PDF parsing library
const mongoose = require("mongoose"); // REQUIRED for safe ObjectId casting

const router = express.Router();

// multer setup for file upload
const upload = multer({ dest: "uploads/" });

require("dotenv").config();
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Candidate uploads resume + starts interview
router.post("/start", authMiddleware(["candidate"]), upload.single("resume"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "Resume file required" });

        // Extract phone number from body (collected on frontend)
        const candidatePhone = req.body.phone;
        
        // --- PDF Parsing Logic ---
        const resumeText = await new Promise((resolve, reject) => {
            const filePath = req.file.path;
            let fullText = '';

            new PdfReader().parseFileItems(filePath, (err, item) => {
                if (err) {
                    return reject(new Error(`PDF Reader Error: ${err.message}`));
                }
                if (!item) {
                    return resolve(fullText.trim());
                }
                if (item.text) {
                    fullText += item.text + ' '; 
                }
            });
        });
        // --- End PDF Parsing Logic ---

        // generate questions with Gemini
        const questions = await generateQuestionsFromResume(resumeText);

        const newInterview = new Interview({
            candidate: req.user._id,
            resumeText,
            questions,
            status: "in-progress"
        });

        await newInterview.save();

        // Make file cleanup safe and defensive
        try {
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
        } catch (cleanupErr) {
            console.error("Warning: Failed to clean up uploaded file:", cleanupErr);
        }
        
        // Remove resumeText before sending to client
        const interviewResponse = newInterview.toObject();
        delete interviewResponse.resumeText;

        res.json({ message: "Interview started with Gemini questions", interview: interviewResponse }); 
    } catch (err) {
        console.error("Error starting interview:", err);
        // Ensure file is deleted even if question generation fails
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: err.message, message: "Failed to start interview." });
    }
});

// -----------------------------------------------------
// *** ACTIVE ROUTE: GET INTERVIEW DETAILS (With Casting Fix) ***
// -----------------------------------------------------
/**
 * GET /api/candidate/interview/:interviewId
 * Candidate retrieves their specific interview doc.
 */
// -----------------------------------------------------
// *** ACTIVE ROUTE: GET INTERVIEW DETAILS (With Casting Fix) ***
// -----------------------------------------------------
router.get("/interview/:interviewId", authMiddleware(["candidate"]), async (req, res) => {
    try {
        console.log("🔎 Incoming interview fetch request");
        console.log("Params:", req.params.interviewId);
        console.log("User from token:", req.user?._id);

        if (!mongoose.Types.ObjectId.isValid(req.params.interviewId)) {
            return res.status(400).json({
                interview: null,
                message: "Invalid Interview ID format."
            });
        }

        const interviewObjectId = new mongoose.Types.ObjectId(req.params.interviewId);
        const userObjectId = new mongoose.Types.ObjectId(req.user._id);

        const interview = await Interview.findOne({
            _id: interviewObjectId,
            candidate: userObjectId
        }).select("-resumeText");

        if (!interview) {
            console.warn(`[FAIL] Interview not found for ID: ${req.params.interviewId} and User: ${req.user._id}`);
            return res.status(404).json({
                interview: null,
                message: "Interview not found or not owned by user."
            });
        }

        console.log("✅ Interview found:", interview._id);
        res.json({ interview });

    } catch (err) {
        console.error("CRITICAL ERROR IN GET INTERVIEW:", err);
        res.status(500).json({
            interview: null,
            error: err.message,
            message: "Error retrieving interview details."
        });
    }
});

// -----------------------------------------------------


/**
 * POST /api/candidate/submit-answer
 * Candidate submits the answer for a specific question.
 */
router.post("/submit-answer", authMiddleware(["candidate"]), async (req, res) => {
    try {
        const { interviewId, questionIndex, answer } = req.body;
        
        if (typeof questionIndex !== 'number' || questionIndex < 0 || !answer) {
            return res.status(400).json({ message: "Invalid questionIndex or missing answer" });
        }
        
        const interview = await Interview.findOne({ _id: interviewId, candidate: req.user._id });

        if (!interview) {
            return res.status(404).json({ message: "Interview not found" });
        }

        if (interview.status !== "in-progress") {
            return res.status(400).json({ message: `Interview is already ${interview.status}` });
        }

        if (questionIndex >= interview.questions.length) {
            return res.status(400).json({ message: "Question index out of bounds" });
        }

        // Save the answer
        interview.questions[questionIndex].answer = answer;
        await interview.save();

        // Check if this was the last question to prompt the client to finalize
        const isLastQuestion = questionIndex === interview.questions.length - 1;

        res.json({ 
            message: "Answer saved successfully", 
            nextQuestionIndex: questionIndex + 1,
            isFinished: isLastQuestion
        });
    } catch (err) {
        console.error("Error submitting answer:", err);
        res.status(500).json({ error: err.message, message: "Failed to submit answer." });
    }
});

/**
 * POST /api/candidate/finalize-interview
 * Candidate finishes answering all questions, triggers final scoring and email.
 */
router.post("/finalize-interview", authMiddleware(["candidate"]), async (req, res) => {
    let interview;
    try {
        const { interviewId } = req.body;

        if (!interviewId) {
            console.error("❌ finalize-interview: Missing interviewId in request body");
            return res.status(400).json({ message: "Missing interviewId" });
        }

        console.log("🔎 Finalizing interview:", interviewId);

        interview = await Interview.findOne({ _id: interviewId, candidate: req.user._id });

        if (!interview) {
            console.error(`❌ Interview not found for ID: ${interviewId}`);
            return res.status(404).json({ message: "Interview not found" });
        }

        if (interview.status === "completed") {
            console.warn(`⚠️ Interview already completed: ${interviewId}`);
            return res.status(400).json({ message: "Interview already completed." });
        }

        const totalQuestions = interview.questions.length;
        let runningScoreSum = 0;

        console.log("📝 Scoring questions...");
        const scoringPromises = interview.questions.map(async (q, index) => {
            if (q.answer && q.score === undefined) {
                console.log(`🔍 Evaluating question ${index + 1}`);
                const score = await evaluateAnswer(q.question, q.answer, q.difficulty, interview.resumeText);
                console.log(`✅ Question ${index + 1} score: ${score}`);
                return { ...q.toObject(), score };
            }
            return q.toObject();
        });

        const scoredQuestions = await Promise.all(scoringPromises);

        runningScoreSum = scoredQuestions.reduce((sum, q) => sum + (q.score || 0), 0);

        interview.questions = scoredQuestions;

        const MAX_TOTAL_SCORE = totalQuestions * 100;
        interview.totalScore = Math.round((runningScoreSum / MAX_TOTAL_SCORE) * 100);

        console.log("📊 Total Score:", interview.totalScore);

        console.log("✍ Generating summary...");
        const summary = await generateSummary(interview.questions, interview.totalScore);
        interview.summary = summary;

        interview.status = "completed";
        await interview.save();

        console.log("📨 Sending results email...");
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: req.user.email,
            subject: "Your AI Interview Results are Ready",
            html: `
                <h2>Interview Complete!</h2>
                <p>Hello ${req.user.name},</p>
                <p>Your interview has been successfully graded.</p>
                <h3>Overall Score: ${interview.totalScore}%</h3>
                <h4>Summary:</h4>
                <p>${summary.replace(/\n/g, "<br>")}</p>
                <p>A full report is available on your dashboard.</p>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log("✅ Email sent successfully");

        res.json({
            message: "Interview finalized, scored, and results emailed!",
            totalScore: interview.totalScore,
            summary: interview.summary,
        });
    } catch (err) {
        console.error("❌ Error finalizing interview:", err);

        if (interview && interview.status !== "completed") {
            console.log("⚠ Updating interview status to failed");
            await Interview.updateOne({ _id: interview._id }, { $set: { status: "failed" } });
        }

        res.status(500).json({
            error: err.message,
            message: "Error finalizing interview or sending email.",
        });
    }
});


module.exports = router;