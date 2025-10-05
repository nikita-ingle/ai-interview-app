// const mongoose = require("mongoose");

// const InterviewSchema = new mongoose.Schema({
//   candidate: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: "User", 
//     required: true 
//   },
//   interviewer: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: "User" 
//   },
//   resumeText: { type: String }, // extracted text from resume
//   questions: [
//     {
//       question: String,
//       answer: String,
//       score: Number // optional, for auto-eval later
//     }
//   ],
//   totalScore: { type: Number, default: 0 },
//   status: { 
//     type: String, 
//     enum: ["pending", "in-progress", "completed"], 
//     default: "pending" 
//   }
// }, { timestamps: true });

// module.exports = mongoose.model("Interview", InterviewSchema);


const mongoose = require("mongoose");

const QuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, default: "" }, // Store candidate's answer here
  difficulty: { 
    type: String, 
    enum: ["easy", "medium", "hard"], 
    required: true // Now required
  },
  timeLimit: { type: Number, required: true }, // Time in seconds
  score: { type: Number }, // AI score for this specific question
});

const InterviewSchema = new mongoose.Schema({
  candidate: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  // Interviewer link is optional unless you want interviewers to review/grade
  interviewer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },
  resumeText: { type: String }, // extracted text from resume
  questions: [QuestionSchema], // Use the defined sub-schema
  totalScore: { type: Number, default: 0 },
  summary: { type: String }, // To store the AI-generated summary
  status: { 
    type: String, 
    enum: ["pending", "in-progress", "completed", "failed"], // Added 'failed' for upload/Gemini issues
    default: "pending" 
  }
}, { timestamps: true });

module.exports = mongoose.model("Interview", InterviewSchema);