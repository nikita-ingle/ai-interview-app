// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';

// Import Pages
import AuthPage from './pages/AuthPage';
import CandidateDashboard from './pages/CandidateDashboard';
import InterviewerScoreboard from './pages/InterviewerScoreboard';
import InterviewPage from './pages/InterviewPage'; 
import ResultsPage from "./pages/ResultsPage";
// You would also import InterviewPage here

const App = () => {
  return (
    <Router>
      <Routes>
        {/* PUBLIC ROUTE: Login/Signup */}
        <Route path="/" element={<AuthPage />} />

        {/* PROTECTED CANDIDATE ROUTES */}
        <Route 
          path="/candidate/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['candidate']}>
              <CandidateDashboard />
            </ProtectedRoute>
          } 
        />
        {/* Example: The actual interview page */}
        <Route 
          path="/candidate/interview/:interviewId" 
          element={
            <ProtectedRoute allowedRoles={['candidate']}>
              <InterviewPage />
              {/* <div>Candidate Interview Page (Protected)</div> */}
            </ProtectedRoute>
          } 
        />

        {/* PROTECTED INTERVIEWER ROUTES */}
        <Route 
          path="/interviewer/scoreboard" 
          element={
            <ProtectedRoute allowedRoles={['interviewer']}>
              <InterviewerScoreboard />
            </ProtectedRoute>
          } 
        />
        {/* Example: The detailed report page */}
        <Route 
          path="/interviewer/report/:interviewId" 
          element={
            <ProtectedRoute allowedRoles={['interviewer']}>
              <div>Interviewer Report Detail (Protected)</div>
            </ProtectedRoute>
          } 
        />
        {/* <Route path="/candidate/results/:interviewId" element={<ResultsPage />} /> */}
        <Route 
    path="/candidate/results/:interviewId" 
    element={
        <ProtectedRoute allowedRoles={['candidate']}>
            <ResultsPage />
        </ProtectedRoute>
    } 
/>
        {/* FALLBACK: 404 Page */}
        <Route path="*" element={<div>404 Page Not Found</div>} />
      </Routes>
    </Router>
  );
};

export default App;