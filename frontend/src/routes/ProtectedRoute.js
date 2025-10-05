// src/routes/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * A wrapper component to protect routes based on authentication status and role.
 * @param {string[]} allowedRoles - Array of roles allowed to access this route (e.g., ["candidate", "interviewer"])
 * @param {React.Component} children - The component to render if authentication passes
 */
const ProtectedRoute = ({ allowedRoles, children }) => {
    const { isAuthenticated, role, isLoading } = useAuth();

    // 1. Wait for AuthContext to finish loading initial state from local storage
    if (isLoading) {
        // You can return a loading spinner here in a real app
        return <div>Loading authentication...</div>;
    }

    // 2. Check if the user is authenticated at all
    if (!isAuthenticated) {
        // If not logged in, redirect to the login page
        return <Navigate to="/" replace />;
    }

    // 3. Check if the user's role is permitted
    if (allowedRoles && !allowedRoles.includes(role)) {
        // If role is insufficient (e.g., candidate tries to view interviewer page)
        // We can redirect them to their correct dashboard
        const redirectPath = role === 'candidate' ? '/candidate/dashboard' : '/interviewer/scoreboard';
        return <Navigate to={redirectPath} replace />;
    }

    // 4. Authentication and Role Check Passed: Render the child component
    return children;
};

export default ProtectedRoute;