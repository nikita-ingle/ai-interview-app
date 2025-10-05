// src/pages/AuthPage.js

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { loginUser, signupUser } from '../api/auth';
import { useNavigate } from 'react-router-dom'; // <--- The essential import

const APPLICATION_NAME = "Axiom AI Interviews";

const AuthPage = () => {
    // 1. ADD THE HOOK CALL
    const navigate = useNavigate(); // <--- This enables controlled redirection

    // 1. STATE MANAGEMENT
    const { login } = useAuth();
    const [isLoginView, setIsLoginView] = useState(true);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Form data state (rest of the state is fine)
    const [formData, setFormData] = useState({ 
        name: '', 
        email: '', 
        password: '', 
        role: 'candidate'
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    // 2. HANDLE SUBMISSION (With integrated navigation logic)
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            let responseData;
            
            if (isLoginView) {
                // --- LOGIN LOGIC ---
                responseData = await loginUser(formData.email, formData.password);
                
            } else {
                // --- SIGNUP LOGIC ---
                await signupUser(formData.name, formData.email, formData.password, formData.role);
                
                // Immediately log the user in after successful signup
                responseData = await loginUser(formData.email, formData.password);
            }

            // **FINAL LOGIN AND REDIRECTION LOGIC**
            if (responseData && responseData.token && responseData.user && responseData.user.role) {
                
                const userRole = responseData.user.role;
                
                // 1. Save state in Context (saves token/role/user)
                login(responseData.token, responseData.user, userRole);
                
                // 2. PERFORM REDIRECTION USING useNavigate
                if (userRole === 'candidate') {
                    navigate('/candidate/dashboard'); // Correct Candidate path
                } else if (userRole === 'interviewer') {
                    navigate('/interviewer/scoreboard'); // Correct Interviewer path
                } else {
                    // Fallback should not be hit
                    navigate('/');
                }
            } else {
                setError('Login failed: Invalid data structure from server.');
            }

        } catch (err) {
            console.error("Authentication Error:", err);
            // Display error from the API response
            const apiMessage = err.toString().includes('User not found') ? 'Invalid Email or Password' : (err.toString().includes('User already exists') ? 'User already exists. Please log in.' : 'Connection failed or server error.');
            setError(apiMessage);
        } finally {
            setLoading(false);
        }
    };

    // 3. UI RENDERING (Rest of the component remains the same)
    return (
        <div style={styles.container}>
            {/* Left Column: Application Pitch / Landing Content */}
            <div style={styles.landingContent}>
                <h1 style={styles.appTitle}>{APPLICATION_NAME}</h1>
                <p style={styles.tagline}>Intelligent interviews, decisive hiring.</p>
                <ul style={styles.featureList}>
                    <li>AI-Generated Questions based on Resume</li>
                    <li>Automated Scoring & Candidate Summaries</li>
                    <li>Interviewer Scoreboard Access</li>
                    <li>Secure, Timed Interview Environment</li>
                </ul>
            </div>

            {/* Right Column: Auth Form Card */}
            <div style={styles.authCard}>
                <h3 style={styles.cardTitle}>{isLoginView ? 'Welcome Back' : 'Get Started'}</h3>

                <form onSubmit={handleSubmit} style={styles.form}>
                    
                    {/* Name Input */}
                    {!isLoginView && (
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Full Name"
                            required
                            style={styles.input}
                        />
                    )}

                    {/* Email Input */}
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Email Address"
                        required
                        style={styles.input}
                    />

                    {/* Password Input */}
                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Password"
                        required
                        style={styles.input}
                    />

                    {/* Role Selection */}
                    {!isLoginView && (
                        <select 
                            name="role" 
                            value={formData.role} 
                            onChange={handleChange}
                            style={styles.select}
                        >
                            <option value="candidate">Candidate</option>
                            <option value="interviewer">Interviewer</option>
                        </select>
                    )}
                    
                    {/* Error Message */}
                    {error && <p style={styles.error}>{error}</p>}

                    {/* Submit Button */}
                    <button 
                        type="submit" 
                        disabled={loading}
                        style={styles.button}
                    >
                        {loading ? 'Processing...' : (isLoginView ? 'Login to Dashboard' : 'Create Account')}
                    </button>
                </form>

                {/* Toggle Link */}
                <p style={styles.toggleText}>
                    {isLoginView ? "Need an account?" : "Already a user?"}
                    <span 
                        onClick={() => {
                            setIsLoginView(!isLoginView);
                            setError('');
                        }}
                        style={styles.toggleLink}
                    >
                        {isLoginView ? ' Sign Up here.' : ' Login here.'}
                    </span>
                </p>
            </div>
        </div>
    );
};

// --- STYLES (Provided in the previous message, assumed correct) ---
const COLOR_PRIMARY = '#007acc'; 
const COLOR_SECONDARY = '#005f99';
const COLOR_TEXT = '#e0e0e0';
const COLOR_BACKGROUND = '#121212';
const COLOR_CARD = '#1e1e1e';
const styles = {
    container: {
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: COLOR_BACKGROUND, 
        color: COLOR_TEXT,
    },
    landingContent: {
        flex: 1.5,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 8%',
        backgroundColor: '#1b1b1b',
    },
    appTitle: {
        fontSize: '48px',
        color: COLOR_PRIMARY,
        marginBottom: '10px',
        fontWeight: 300,
    },
    tagline: {
        fontSize: '24px',
        marginBottom: '40px',
        color: '#aaaaaa',
    },
    featureList: {
        listStyle: 'none',
        paddingLeft: 0,
        textAlign: 'left',
        fontSize: '18px',
    },
    authCard: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLOR_CARD,
        padding: '40px',
        boxShadow: `0 0 50px rgba(0, 122, 204, 0.1)`,
    },
    cardTitle: {
        fontSize: '28px',
        marginBottom: '25px',
        fontWeight: 400,
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: '300px',
    },
    input: {
        padding: '12px',
        margin: '8px 0',
        borderRadius: '5px',
        border: '1px solid #444',
        backgroundColor: '#2b2b2b',
        color: COLOR_TEXT,
        fontSize: '16px',
    },
    select: {
        padding: '10px',
        margin: '8px 0 15px',
        borderRadius: '5px',
        border: '1px solid #444',
        backgroundColor: '#2b2b2b',
        color: COLOR_TEXT,
        fontSize: '16px',
        height: '42px',
    },
    button: {
        padding: '12px 20px',
        backgroundColor: COLOR_PRIMARY,
        color: COLOR_BACKGROUND,
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        marginTop: '20px',
        fontSize: '16px',
        fontWeight: 'bold',
        transition: 'background-color 0.3s',
    },
    error: {
        color: '#ff6b6b',
        marginTop: '10px',
    },
    toggleText: {
        fontSize: '14px',
        marginTop: '25px',
    },
    toggleLink: {
        color: COLOR_PRIMARY,
        cursor: 'pointer',
        marginLeft: '5px',
        fontWeight: 'bold',
        textDecoration: 'underline',
    }
};

export default AuthPage;