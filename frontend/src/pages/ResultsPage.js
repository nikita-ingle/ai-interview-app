import React from "react";

const ResultsPage = () => {
    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.title}>Interview Complete ✅</h1>
                <p style={styles.message}>
                    Your interview is complete. Please check your email for results.
                </p>
            </div>
        </div>
    );
};

const styles = {
    container: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#121212"
    },
    card: {
        backgroundColor: "#1e1e1e",
        padding: "30px 40px",
        borderRadius: "10px",
        color: "#e0e0e0",
        textAlign: "center",
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.7)"
    },
    title: {
        fontSize: "28px",
        color: "#4caf50",
        marginBottom: "10px"
    },
    message: {
        fontSize: "18px",
        color: "#ccc"
    }
};

export default ResultsPage;
