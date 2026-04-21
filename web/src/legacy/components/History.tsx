import React, { useState, useEffect } from 'react';
import { questionsAPI } from '../services/api';

interface ExamHistory {
  id: number;
  subject: string;
  score?: number;
  total_questions?: number;
  created_at: string;
  questions_generated: number;
}

export function History() {
  const [history, setHistory] = useState<ExamHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await questionsAPI.getExamHistory();
      setHistory(response.data || []);
    } catch (err) {
      setError('Failed to load practice history');
      console.error('History loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="history-container">
        <div className="history-header">
          <h1>Practice History</h1>
          <p>Review your past practice sessions</p>
        </div>
        <div className="loading-spinner">Loading history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="history-container">
        <div className="history-header">
          <h1>Practice History</h1>
          <p>Review your past practice sessions</p>
        </div>
        <div className="error-message">{error}</div>
        <button onClick={loadHistory} className="retry-button">Retry</button>
      </div>
    );
  }

  return (
    <div className="history-container">
      <div className="history-header">
        <h1>Practice History</h1>
        <p>Review your past practice sessions and track your progress</p>
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h3>No practice history yet</h3>
          <p>Start practicing questions to see your history here</p>
        </div>
      ) : (
        <div className="history-list">
          {history.map((item) => (
            <div key={item.id} className="history-item">
              <div className="history-item__header">
                <h3>{item.subject}</h3>
                <span className="history-date">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="history-item__stats">
                <span>Questions: {item.questions_generated}</span>
                {item.score !== undefined && item.total_questions && (
                  <span>Score: {item.score}/{item.total_questions}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}