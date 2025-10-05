// src/pages/InterviewerScoreboard.js
import React from 'react';
import { useAuth } from '../context/AuthContext';

const InterviewerScoreboard = () => {
    const { logout, user } = useAuth();
    return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1>Interviewer Scoreboard</h1>
            {user && <h2>Welcome, {user.name} ({user.role})!</h2>}
            <p>This is where you will see the list of candidate results.</p>
            <button onClick={logout}>Logout</button>
        </div>
    );
};

export default InterviewerScoreboard;