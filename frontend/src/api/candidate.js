// src/api/candidate.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/candidate'; 

/**
 * Sends the resume and user details to start the interview.
 * @param {File} resumeFile - The PDF file object.
 * @param {string} candidatePhone - The candidate's phone number (collected on frontend).
 * @param {string} token - The user's JWT token.
 * @returns {Promise<object>} Interview object with questions.
 */
export const startInterview = async (resumeFile, candidatePhone, token) => {
    const formData = new FormData();
    formData.append('resume', resumeFile); 
    formData.append('phone', candidatePhone); // Send phone number to the backend
    
    const authHeaderValue = `Bearer ${token}`; 

    // console.log("DEBUG: Sending Auth Header Value:", authHeaderValue); // REMOVED DEBUG LOG
    
    try {
        const response = await axios.post(`${API_BASE_URL}/start`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data', 
                'Authorization': authHeaderValue, 
            },
        });
        
        return response.data.interview; 

    } catch (error) {
        console.error("Error starting interview:", error.response || error);
        throw error.response?.data?.message || 'Failed to start interview. Check your file or connection.';
    }
};

/**
 * Retrieves the interview document for the candidate by ID.
 * REQUIRED for the InterviewPage to load questions upon navigation/refresh.
 * @param {string} interviewId
 * @param {string} token
 * @returns {Promise<object>} The full interview document (excluding resumeText).
 */
export const getInterviewDetails = async (interviewId, token) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/interview/${interviewId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        if (!response.data.interview) {
             // This guards against a 200 OK but empty body
             throw new Error("Interview data not found in response body."); 
        }
        // The backend returns { interview: { id, questions, status, etc. } }
        return response.data.interview;
    } catch (error) {
        console.error("Error fetching interview details:", error.response || error);
        throw error.response?.data?.message || 'Failed to load interview details.';
    }
};


/**
 * Submits the candidate's answer for a specific question.
 * @param {string} interviewId
 * @param {number} questionIndex
 * @param {string} answer
 * @param {string} token
 * @returns {Promise<object>} The server response (includes nextQuestionIndex).
 */
export const submitAnswer = async (interviewId, questionIndex, answer, token) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/submit-answer`, {
            interviewId,
            questionIndex,
            answer,
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Error submitting answer:", error.response || error);
        throw error.response?.data?.message || 'Failed to submit answer.';
    }
};

/**
 * Finalizes an interview by sending a request to the backend.
 * @param {string} interviewId
 * @param {string} token
 * @returns {Promise<object>} The server response with score and summary.
 */
export const finalizeInterview = async (interviewId, token) => {
    try {
        if (!interviewId || !token) {
            throw new Error("Missing interviewId or token");
        }

        const response = await axios.post(
            `${API_BASE_URL}/finalize-interview`,
            { interviewId }, // ✅ Ensure interviewId is in body
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
            }
        );

        console.log("📤 Finalize Interview Response:", response.data);
        return response.data;
    } catch (error) {
        console.error("❌ Error finalizing interview:", error.response || error);

        // Return backend error message if available
        const message =
            error.response?.data?.message ||
            error.response?.data?.error ||
            error.message ||
            "Error finalizing interview or sending email.";

        throw new Error(message);
    }
};
