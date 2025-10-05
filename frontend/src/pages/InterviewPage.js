import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getInterviewDetails, submitAnswer, finalizeInterview } from '../api/candidate';

const InterviewPage = () => {
    const { interviewId } = useParams();
    const navigate = useNavigate();
    const { token, logout } = useAuth();

    const [interview, setInterview] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answerText, setAnswerText] = useState('');
    const [timeLeft, setTimeLeft] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const timerRef = useRef(null);

    const questions = interview?.questions || [];
    const currentQuestion = questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === (questions.length - 1);

    const handleViewResults = useCallback(() => {
        navigate(`/candidate/results/${interviewId}`);
    }, [navigate, interviewId]);

    const startQuestionTimer = useCallback((duration, submitHandler) => {
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeLeft(duration);

        timerRef.current = setInterval(() => {
            setTimeLeft(prevTime => {
                if (prevTime <= 1) {
                    clearInterval(timerRef.current);
                    setTimeout(() => submitHandler(true), 10);
                    return 0;
                }
                return prevTime - 1;
            });
        }, 1000);
    }, []);

    let handleSubmitAnswer;
    handleSubmitAnswer = useCallback(async (isTimedOut = false) => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (loading || !token) return;

        setLoading(true);
        setError('');

        const answerToSubmit = isTimedOut ? "" : answerText;

        if (answerToSubmit.trim() === '' && !isTimedOut && !isLastQuestion) {
            setError("Answer cannot be empty if submitting manually.");
            setLoading(false);
            return;
        }

        try {
            await submitAnswer(interviewId, currentQuestionIndex, answerToSubmit, token);
            setAnswerText('');

            if (isLastQuestion) {
                await finalizeInterview(interviewId, token);
                handleViewResults();
                return;
            }

            setCurrentQuestionIndex(prevIndex => prevIndex + 1);

        } catch (err) {
            console.error("❌ Submission/Finalization Error:", err);
            setError(`Error: ${err.response?.data?.message || err.message || err.toString()}. Please retry.`);

            if (isTimedOut || isLastQuestion) {
                setCurrentQuestionIndex(prevIndex => prevIndex + 1);
            }

        } finally {
            setLoading(false);
        }
    }, [interviewId, currentQuestionIndex, answerText, token, loading, isLastQuestion, handleViewResults]);

    useEffect(() => {
        let isCancelled = false;

        const fetchDetails = async () => {
            if (!token || !interviewId) {
                setLoading(false);
                setError("Invalid Interview ID or missing token.");
                return;
            }

            try {
                console.log("🎯 Fetching interview with ID:", interviewId);
                const data = await getInterviewDetails(interviewId, token);
                console.log("📥 Interview API response:", data);

                if (!data) {
                    const msg = "Interview not found or no data returned.";
                    if (!isCancelled) {
                        setError(msg);
                        setLoading(false);
                    }
                    return;
                }

                const fetchedInterview = data.interview || data;

                if (fetchedInterview.status === 'completed') {
                    if (!isCancelled) {
                        setInterview(fetchedInterview);
                        handleViewResults();
                    }
                    return;
                }

                const firstUnansweredIndex = fetchedInterview.questions.findIndex(q => !q.answer);
                const startIndex = firstUnansweredIndex !== -1
                    ? firstUnansweredIndex
                    : fetchedInterview.questions.length - 1;

                if (!isCancelled) {
                    setCurrentQuestionIndex(startIndex);
                    setInterview(fetchedInterview);
                    setLoading(false);

                    const timeLimit = fetchedInterview.questions[startIndex].timeLimit || 60;
                    startQuestionTimer(timeLimit, handleSubmitAnswer);
                }

            } catch (err) {
                if (!isCancelled) {
                    console.error("❌ Fetch Interview Error:", err);
                    setError(`Failed to load interview: ${err.response?.data?.message || err.message}`);
                    setLoading(false);
                }
            }
        };

        fetchDetails();

        return () => {
            isCancelled = true;
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    useEffect(() => {
        if (currentQuestion && interview?.status === 'in-progress') {
            startQuestionTimer(currentQuestion.timeLimit || 60, handleSubmitAnswer);
        }
    }, [currentQuestionIndex]);

    if (loading) return <div style={styles.container}><h1>Loading Interview...</h1></div>;
    if (error) return <div style={styles.container}><h1 style={styles.error}>Error: {error}</h1></div>;
    if (!interview || questions.length === 0) return <div style={styles.container}><h1>Interview Not Found or Questions Not Loaded</h1></div>;

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <h1 style={styles.title}>AI Interview In Progress</h1>
                    <button onClick={logout} style={styles.logoutButton}>Logout</button>
                    <div style={styles.timerBox}>
                        <span style={styles.timerText}>Time Remaining: </span>
                        <span style={styles.timerValue}>{timeLeft}s</span>
                    </div>
                </div>

                <h2 style={styles.questionCounter}>
                    Question {currentQuestionIndex + 1} of {interview.questions.length} ({currentQuestion.difficulty?.toUpperCase() || "N/A"})
                </h2>

                <div style={styles.questionBox}>
                    {currentQuestion.question}
                </div>

                <textarea
                    placeholder="Type your answer here..."
                    rows="8"
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    style={styles.textarea}
                    disabled={loading || timeLeft === 0}
                />

                <p style={styles.submitMessage}>
                    {isLastQuestion
                        ? 'This is the final question. Clicking the button will trigger scoring.'
                        : 'Your answer will be submitted when the timer hits zero or when you click "Submit & Next".'}
                </p>

                <button
                    onClick={() => handleSubmitAnswer(false)}
                    disabled={loading || (answerText.trim() === '' && !isLastQuestion) || timeLeft === 0}
                    style={styles.button}
                >
                    {loading
                        ? 'Submitting...'
                        : isLastQuestion
                            ? 'FINALIZE & VIEW RESULTS'
                            : 'Submit & Next Question'}
                </button>
            </div>
        </div>
    );
};

const styles = {
    container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#121212' },
    card: { backgroundColor: '#1e1e1e', padding: '30px 40px', borderRadius: '10px', color: '#e0e0e0', width: '700px', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' },
    title: { fontSize: '24px', color: '#007acc', fontWeight: 600 },
    logoutButton: { background: 'none', border: '1px solid #007acc', color: '#007acc', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s' },
    timerBox: { backgroundColor: '#333', padding: '5px 10px', borderRadius: '5px', marginLeft: '20px' },
    timerText: { fontSize: '16px', marginRight: '5px' },
    timerValue: { fontSize: '20px', fontWeight: 'bold', color: '#ff6b6b' },
    questionCounter: { fontSize: '18px', marginBottom: '15px', color: '#ccc' },
    questionBox: { backgroundColor: '#252525', padding: '20px', borderRadius: '8px', minHeight: '80px', marginBottom: '20px', fontSize: '18px', borderLeft: '4px solid #007acc', textAlign: 'left' },
    textarea: { width: '100%', minHeight: '150px', padding: '15px', borderRadius: '5px', border: '1px solid #444', backgroundColor: '#333', color: '#e0e0e0', fontSize: '16px', resize: 'vertical', boxSizing: 'border-box' },
    submitMessage: { fontSize: '14px', color: '#aaa', marginTop: '10px', marginBottom: '10px' },
    button: { width: '100%', padding: '15px 20px', backgroundColor: '#007acc', color: '#121212', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', marginTop: '20px', transition: 'background-color 0.2s' },
    error: { color: '#ff6b6b' }
};

export default InterviewPage;
