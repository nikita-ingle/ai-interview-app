// src/api/auth.js
import axios from 'axios';

// IMPORTANT: Replace this with your actual backend URL from .env or hardcode it for testing.
// In development, it's usually http://localhost:5000
const API_URL = 'http://localhost:5000/api/auth'; 

/**
 * Handles user login by calling the backend API.
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<object>} Response data containing token and user info.
 */
export const loginUser = async (email, password) => {
    try {
        const response = await axios.post(`${API_URL}/login`, {
            email,
            password,
        });
        // The backend returns { token, user: { id, name, email, role } }
        return response.data;
    } catch (error) {
        // Throw a user-friendly message or the API error response
        throw error.response?.data?.message || 'Login failed due to network error.';
    }
};

/**
 * Handles user signup by calling the backend API.
 * @param {string} name 
 * @param {string} email 
 * @param {string} password 
 * @param {string} role (candidate or interviewer)
 * @returns {Promise<object>} Response data.
 */
export const signupUser = async (name, email, password, role) => {
    try {
        const response = await axios.post(`${API_URL}/signup`, {
            name,
            email,
            password,
            role,
        });
        // The backend returns { message, user }
        return response.data;
    } catch (error) {
        // Throw a user-friendly message or the API error response
        throw error.response?.data?.message || 'Signup failed due to network error.';
    }
};