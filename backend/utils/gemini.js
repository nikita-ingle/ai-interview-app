const { GoogleGenerativeAI } = require("@google/generative-ai");
const Interview = require("../models/Interview"); 

// --- 1. Top-Level Initialization and Scoping ---
let genAI; 
// Using the key you pasted in the code (which worked in curl)
const WORKING_KEY = process.env.GEMINI_API_KEY || "AIzaSyCZIZolfhlildaTUZHRjUh7GFwPR2DN1WU"; 

try {
    if (!WORKING_KEY || WORKING_KEY.length < 30) {
        console.error("FATAL: Gemini API key is missing or incomplete.");
        genAI = new GoogleGenerativeAI("DUMMY_KEY_TO_PREVENT_CRASH"); 
    } else {
        genAI = new GoogleGenerativeAI(WORKING_KEY);
    }
} catch (e) {
    console.error("Failed to initialize GoogleGenerativeAI:", e);
}

const TIME_LIMITS = {
    easy: 30,
    medium: 50,
    hard: 80
};

// --- Helper function for robust text extraction ---
// This handles result.text, result.response?.text, and ensures a string is returned
// --- Helper function for robust text extraction ---
function extractText(result) {
  try {
    // Case 1: Some SDK versions expose .text() method
    if (typeof result.response?.text === "function") {
      return result.response.text().trim();
    }

    // Case 2: Direct candidates array access
    if (result.response?.candidates?.length > 0) {
      const candidate = result.response.candidates[0];
      const text = candidate?.content?.parts?.[0]?.text;
      if (text) return text.trim();
    }

    // Case 3: Fallback old way
    if (typeof result.text === "string") {
      return result.text.trim();
    }

    return "";
  } catch (err) {
    console.error("Failed to extract text:", err, result);
    return "";
  }
}

// ----------------------------------------------------


// --- 2. generateQuestionsFromResume (Primary Fix Location) ---
async function generateQuestionsFromResume(resumeText) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" }); 

    const prompt = `
    Based on the following resume, generate exactly 6 technical interview questions: 
    2 easy, 2 medium, and 2 hard. 
    
    Each question should test technical knowledge or practical skills relevant to the resume. 
    
    Return the questions as a plain JSON array. Each object in the array MUST have two keys: 
    "question" (string) and "difficulty" (string, must be one of 'easy', 'medium', or 'hard'). 
    
    The JSON MUST be an array of exactly 6 objects. Do not include any extra text or markdown like \`\`\`json.
    
    Resume:
    ${resumeText}
    `;

    const result = await model.generateContent(
    prompt, // Argument 1: The prompt string
    { // Argument 2: The config object
        responseMimeType: "application/json"
    }
);
    
    // *** FINAL FIX APPLIED ***
    const text = extractText(result); 
    // *************************
    // Remove markdown fences and surrounding garbage before parsing
    const cleanedText = text
    .substring(text.indexOf('['), text.lastIndexOf(']') + 1)
    .trim();

    // Fallback to remove ```json and newlines if simple substring fails
    const finalJson = cleanedText.replace(/```json|```/g, '').trim(); 
    // -----------------------------

    // Try parsing JSON safely
    let questions = [];
    try {
        questions = JSON.parse(finalJson);
        
        // Add time limit based on difficulty
        questions = questions.map(q => ({
            ...q,
            timeLimit: TIME_LIMITS[q.difficulty.toLowerCase()] || 30 
        }));

    } catch (err) {
        console.error("Gemini output not valid JSON or structure is incorrect. Raw output:", text);
        throw new Error("Failed to generate structured questions from AI.");
    }

    if (questions.length !== 6) {
        console.warn(`Gemini returned ${questions.length} questions, expected 6.`);
    }
    
    return questions;
}

// --- 3. evaluateAnswer (Final Fix Location) ---
// module.exports.evaluateAnswer = async (question, answer, difficulty, resumeText) => {
//     console.log("⚡ Mock scoring for testing (Gemini API skipped)");
//     return Math.floor(Math.random() * 100); // Random score between 0–100
// };

async function evaluateAnswer(question, answer, difficulty, resumeText) {
    console.log("⚡ Mock scoring for testing (Gemini API skipped)");
    // simulate scoring logic
    const score = Math.floor(Math.random() * 100);
    return score;
}

// async function evaluateAnswer(question, answer, difficulty, resumeText) {
//     const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" }); 
    
//     const prompt = `
//     You are an expert technical interviewer. Evaluate the candidate's answer for the question below.
//     The difficulty was ${difficulty}. The evaluation must consider the quality of the answer, 
//     technical depth, and relevance to the candidate's resume (provided for context).
    
//     The response MUST be a single JSON object with two keys:
//     1. "score": An integer score between 0 and 100.
//     2. "rationale": A brief (1-2 sentence) explanation for the score.
    
//     Do not include any extra text or markdown like \`\`\`json.
    
//     ---
//     Resume Context: ${resumeText.substring(0, 500)}...
//     Question: ${question}
//     Candidate's Answer: ${answer}
//     ---
//     `;

//     const result = await model.generateContent(
//     prompt, // Argument 1: The prompt string
//     { // Argument 2: The config object
//         responseMimeType: "application/json"
//     }
// );
    
//     // *** FINAL FIX APPLIED ***
//     const text = extractText(result); 
//     // *************************
    
//     try {
//         const evaluation = JSON.parse(text);
//         return evaluation.score; 
//     } catch (err) {
//         console.error("Gemini evaluation output not valid JSON. Raw output:", text);
//         return 0; 
//     }
// }

// --- 4. generateSummary (Final Fix Location) ---
async function generateSummary(questions, totalScore) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" }); 
    
    const interviewDetails = questions.map(q => 
        `Difficulty: ${q.difficulty}, Question: ${q.question}, Score: ${q.score}, Answer: ${q.answer.substring(0, 100)}...`
    ).join('\n');
    
    const prompt = `
    Based on the following interview results and a total score of ${totalScore}, generate a professional 
    candidate summary for an interviewer. 
    
    The summary should include:
    1. An overall assessment of their technical competence.
    2. Strengths identified from their answers.
    3. Weaknesses/Areas for improvement.
    4. A final recommendation (e.g., 'Strong Hire', 'Potential Hire', 'No Hire').
    
    Interview Details:
    ${interviewDetails}
    `;

    const result = await model.generateContent(
        prompt,
        {}
    );
    // *** FINAL FIX APPLIED ***
    return extractText(result);
    // *************************
}

module.exports = { 
    generateQuestionsFromResume, 
    evaluateAnswer,
    generateSummary 
};