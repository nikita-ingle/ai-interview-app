// src/context/AuthContext.js

import React, { createContext, useState, useEffect, useContext } from 'react';

// 1. Create the Context
const AuthContext = createContext();

// Hook for easy access to auth context
export const useAuth = () => useContext(AuthContext);

// 2. Auth Provider Component
export const AuthProvider = ({ children }) => {
    // Initial state is pulled from local storage to keep the user logged in after a refresh
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [role, setRole] = useState(localStorage.getItem('role') || null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Run once on mount to set initial loading state
        if (token) {
            // In a real app, you might validate the token here via an API call
        }
        setIsLoading(false);
    }, [token]);

    // Function to handle login success
    const login = (token, user, role) => {
        localStorage.setItem('token', token);
        localStorage.setItem('role', role);
        setToken(token);
        setUser(user);
        setRole(role);
    };

    // Function to handle logout
    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        setToken(null);
        setUser(null);
        setRole(null);
        // Redirect to login page
        window.location.href = '/'; 
    };

    // Context Value - exposing state and functions
    const value = {
        user,
        token,
        role,
        isAuthenticated: !!token, // True if token exists
        isLoading,
        login,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {!isLoading && children}
        </AuthContext.Provider>
    );
};


