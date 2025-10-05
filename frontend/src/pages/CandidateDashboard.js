// src/pages/CandidateDashboard.js (Updated & Finalized UI/UX)

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { startInterview } from '../api/candidate';

// --- STYLES CONSTANTS (for cleaner design) ---
const COLOR_PRIMARY = '#007acc'; // Bright blue
const COLOR_TEXT = '#e0e0e0';
const COLOR_BACKGROUND_DARK = '#1e1e1e';
const COLOR_CARD_BG = '#2b2b2b';
const COLOR_INPUT_BG = '#3c3c3c';

const CandidateDashboard = () => {
    const { user, token, logout } = useAuth();
    const navigate = useNavigate();

    const [resumeFile, setResumeFile] = useState(null);
    const [candidatePhone, setCandidatePhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            setResumeFile(file);
            setError('');
        } else {
            setResumeFile(null);
            setError('Error: Please upload a PDF file only.');
        }
    };

    const handleStartInterview = async () => {
        // --- Input Validation ---
        if (!resumeFile) {
            setError('Please select a resume file.');
            return;
        }
        // Assuming a 10-digit phone number is standard for simple validation
        if (!/^\d{8,15}$/.test(candidatePhone)) { 
            setError('Please enter a valid phone number (8-15 digits).');
            return;
        }
        // if (!token) {
        //     setError('Authentication token missing. Please log in again.');
        //     return;
        // }
        console.log("Token Status:", token ? `Token length: ${token.length}` : "Token is NULL/Undefined");
    if (!token) {
        setError('Authentication token missing. Please log in again.');
        return;
    }
        setLoading(true);
        setError('');

        try {
            // FIX: Pass phone number to the API function
            const interviewData = await startInterview(resumeFile, candidatePhone, token); 
            
            // Success! Navigate to the Interview Page
            // The loading state will now turn OFF during the navigation.
            setLoading(false); // Set to false right before navigating for clean transition
            navigate(`/candidate/interview/${interviewData._id}`);

        } catch (err) {
            console.error("Interview start error:", err);
            // This displays the specific backend error, e.g., "Invalid file format" or a Gemini crash message.
            setError(err.toString()); 
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <h1 style={styles.title}>Axiom Candidate Portal</h1>
                    <button onClick={logout} style={styles.logoutButton}>Logout</button>
                </div>
                
                <h2 style={styles.welcomeText}>Welcome, {user?.name || 'Candidate'}</h2>
                <p style={styles.subtitle}>Confirm your details and submit your resume to begin your timed technical interview.</p>

                {/* --- 1. USER DETAIL FIELDS --- */}
                <div style={styles.inputGroup}>
                    <input type="text" value={user?.name || ''} disabled placeholder="Name (Autofilled)" style={{...styles.input, backgroundColor: '#3c3c3c'}} />
                    <input type="email" value={user?.email || ''} disabled placeholder="Email (Autofilled)" style={{...styles.input, backgroundColor: '#3c3c3c'}} />
                    <input 
                        type="tel" 
                        value={candidatePhone} 
                        onChange={(e) => setCandidatePhone(e.target.value)}
                        placeholder="Phone Number (Required)"
                        required
                        style={styles.input}
                    />
                </div>

                {/* --- 2. UPLOAD AREA --- */}
                <div style={styles.uploadArea}>
                    <label htmlFor="resume-upload" style={styles.fileLabel}>
                        {resumeFile ? 'Resume Uploaded! Click to Change' : 'Click to Upload Your Resume (PDF Only)'}
                    </label>
                    <input
                        id="resume-upload"
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileChange}
                        disabled={loading}
                        style={styles.hiddenFileInput}
                    />
                    
                    {resumeFile && (
                        <p style={styles.fileStatus}>
                            File: <strong>{resumeFile.name}</strong>
                        </p>
                    )}
                </div>
                
                {error && <p style={styles.error}>{error}</p>}

                {/* --- 3. START BUTTON --- */}
                <button 
                    onClick={handleStartInterview}
                    disabled={loading || !resumeFile || !/^\d{8,15}$/.test(candidatePhone)}
                    style={styles.button}
                >
                    {loading ? 'ANALYZING RESUME & GENERATING QUESTIONS...' : 'START INTERVIEW'}
                </button>
            </div>
        </div>
    );
};

// --- STYLES ---
const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: COLOR_BACKGROUND_DARK,
    },
    card: {
        backgroundColor: COLOR_CARD_BG,
        padding: '30px 40px',
        borderRadius: '10px',
        color: COLOR_TEXT,
        width: '500px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
    },
    title: {
        fontSize: '20px',
        color: COLOR_PRIMARY,
        fontWeight: 600,
    },
    welcomeText: {
        fontSize: '28px',
        marginBottom: '5px',
    },
    subtitle: {
        fontSize: '14px',
        marginBottom: '30px',
        color: '#aaa',
    },
    inputGroup: {
        marginBottom: '20px',
    },
    input: {
        width: '100%',
        padding: '12px',
        margin: '10px 0',
        borderRadius: '5px',
        border: '1px solid #444',
        backgroundColor: COLOR_INPUT_BG,
        color: COLOR_TEXT,
        fontSize: '16px',
        boxSizing: 'border-box', // Ensure padding is inside width
    },
    uploadArea: {
        border: `2px dashed ${COLOR_PRIMARY}`,
        backgroundColor: '#252525',
        padding: '20px',
        borderRadius: '8px',
        textAlign: 'center',
        cursor: 'pointer',
        marginBottom: '20px',
    },
    fileLabel: {
        display: 'block',
        fontSize: '16px',
        color: COLOR_PRIMARY,
        fontWeight: 'bold',
        cursor: 'pointer',
    },
    hiddenFileInput: {
        display: 'none',
    },
    fileStatus: {
        color: '#ccc',
        marginTop: '10px',
        fontSize: '14px',
    },
    error: {
        color: '#ff6b6b',
        marginTop: '15px',
        marginBottom: '15px',
        fontWeight: 'bold',
    },
    button: {
        width: '100%',
        padding: '14px 20px',
        backgroundColor: COLOR_PRIMARY,
        color: COLOR_BACKGROUND_DARK,
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '18px',
        fontWeight: 'bold',
        transition: 'background-color 0.2s',
    },
    logoutButton: {
        background: 'none',
        border: `1px solid ${COLOR_PRIMARY}`,
        color: COLOR_PRIMARY,
        padding: '8px 15px',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '14px',
        marginLeft: '10px',
        transition: 'all 0.2s',
    }
};

export default CandidateDashboard;