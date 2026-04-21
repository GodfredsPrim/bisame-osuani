import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { LiveQuizStateResponse, PracticeMarkResponse, questionsAPI } from '../services/api';
import MathRenderer from './MathRenderer';

interface Subject {
  id: string;
  name: string;
  year: string;
}

export function LiveQuiz() {
  const [playerName, setPlayerName] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedYear, setSelectedYear] = useState('Year 1');
  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [codeInput, setCodeInput] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [state, setState] = useState<LiveQuizStateResponse | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<PracticeMarkResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLimit] = useState(5);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [semester] = useState('all_year');
  const [subjectSearch, setSubjectSearch] = useState('');

  const years = useMemo(() => {
    const y = Array.from(new Set(subjects.map((s) => s.year))).sort();
    if (y.length > 0 && !y.includes('Year 3')) y.push('Year 3');
    return y;
  }, [subjects]);

  const filteredSubjects = useMemo(() => {
    // If searching, bypass year filter for a global search experience
    if (subjectSearch.trim()) {
      const term = subjectSearch.toLowerCase();
      return subjects.filter(s => s.name.toLowerCase().includes(term));
    }

    let list = subjects;
    if (selectedYear !== 'Year 3') {
      list = list.filter((s) => s.year === selectedYear);
    } else {
      list = Array.from(new Map(subjects.map(s => [s.name, s])).values());
    }

    return list;
  }, [subjects, selectedYear, subjectSearch]);

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const data = await questionsAPI.getSubjects();
        const list = Array.isArray(data.subjects) ? data.subjects : [];
        setSubjects(list);
        if (list[0]) {
          setSelectedYear(list[0].year);
          setSubject(list[0].id);
        }
      } catch {
        setError('Could not load subjects.');
      }
    };
    loadSubjects();
  }, []);

  useEffect(() => {
    const first = filteredSubjects[0];
    if (first && !filteredSubjects.some(s => s.id === subject)) setSubject(first.id);
  }, [selectedYear, filteredSubjects, subject]);

  useEffect(() => {
    if (!roomCode) return;
    const poll = setInterval(async () => {
      try {
        const latest = await questionsAPI.getLiveQuizState(roomCode);
        setState(latest);
        
        const me = latest.leaderboard.find(p => p.player.toLowerCase() === playerName.toLowerCase());
        if (me?.submitted && !result) {
            setResult({
                percentage: me.percentage,
                score_obtained: me.score,
                total_questions: latest.questions.length,
                results: [] 
            });
        }
      } catch {
        // keep quiet during polling
      }
    }, 2500);
    return () => clearInterval(poll);
  }, [roomCode, playerName, result]);

  useEffect(() => {
    if (!state || result) {
      setTimeLeft(null);
      return;
    }
    
    const timer = setInterval(() => {
      const now = Date.now() / 1000;
      const elapsed = now - state.created_at;
      const remaining = Math.max(0, (state.time_limit * 60) - elapsed);
      setTimeLeft(Math.floor(remaining));
      
      if (remaining <= 0 && !result && !loading) {
        clearInterval(timer);
        submitQuiz();
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [state, result, loading]);

  const createRoom = async () => {
    setError('');
    if (!playerName.trim()) return setError('Enter your name first.');
    setLoading(true);
    try {
      const created = await questionsAPI.createLiveQuiz({
        player_name: playerName.trim(),
        subject,
        year: selectedYear,
        question_type: 'multiple_choice',
        num_questions: 10, // Default to 10 for more competitive feel
        difficulty_level: difficulty,
        time_limit: timeLimit,
        semester,
      });
      setRoomCode(created.code);
      const latest = await questionsAPI.getLiveQuizState(created.code);
      setState(latest);
      setAnswers({});
      setResult(null);
    } catch (err) {
      const msg = axios.isAxiosError(err) ? (err.response?.data?.detail || err.message) : 'Failed to create quiz room.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    setError('');
    if (!playerName.trim()) return setError('Enter your name first.');
    if (!codeInput.trim()) return setError('Enter the room code.');
    setLoading(true);
    try {
      const code = codeInput.trim().toUpperCase();
      await questionsAPI.joinLiveQuiz(code, playerName.trim());
      setRoomCode(code);
      const latest = await questionsAPI.getLiveQuizState(code);
      setState(latest);
      setResult(null);
    } catch (err) {
      const msg = axios.isAxiosError(err) ? (err.response?.data?.detail || err.message) : 'Failed to join quiz room.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const submitQuiz = async () => {
    if (!roomCode || !playerName.trim()) return;
    setLoading(true);
    try {
      const maxIndex = state?.questions.length || 0;
      const arr = Array.from({ length: maxIndex }, (_, i) => answers[i] || '');
      const submitted = await questionsAPI.submitLiveQuiz(roomCode, playerName.trim(), arr);
      setResult(submitted.result);
      const latest = await questionsAPI.getLiveQuizState(roomCode);
      setState(latest);

      try {
        await questionsAPI.saveExamHistory({
          exam_type: 'challenge_quiz',
          subject: subject,
          score_obtained: submitted.result.score_obtained,
          total_questions: submitted.result.total_questions,
          percentage: submitted.result.percentage,
          details_json: JSON.stringify(submitted.result.results || [])
        });
      } catch (historyErr) {
        console.warn('Failed to save challenge history:', historyErr);
      }
    } catch (err) {
      const msg = axios.isAxiosError(err) ? (err.response?.data?.detail || err.message) : 'Failed to submit quiz score.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}.`;
  };

  return (
    <div className="quiz-room-container">
      {!roomCode ? (
        <div className="quiz-v2-setup">
          <div className="quiz-hero" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div className="live-dot" style={{ width: '20px', height: '20px' }}></div>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', color: 'white', margin: 0 }}>Quiz Challenge</h2>
                <p style={{ opacity: 0.7, margin: '5px 0 0 0' }}>Join a live competitive room or host your own.</p>
              </div>
            </div>
          </div>

          {error && <div className="error-message" style={{ margin: '20px 0' }}>⚠️ {error}</div>}

          <div className="quiz-v2-card" style={{ marginBottom: '2rem' }}>
             <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label style={{ fontSize: '1rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Your Display Name</label>
              <input 
                value={playerName} 
                onChange={(e) => setPlayerName(e.target.value)} 
                placeholder="How should we call you?" 
                className="chat-input" 
                style={{ fontSize: '1.2rem', padding: '15px', borderRadius: '15px' }} 
              />
            </div>

            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div className="form-group">
                <label>Academic Year</label>
                <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                  {years.map((y) => <option key={y}>{y}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="subject-search-live">Search & Select Subject</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                  <input 
                    id="subject-search-live"
                    type="text" 
                    placeholder="🔍 Type to search all subjects..." 
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)}
                    className="chat-input"
                    style={{ flex: 1, padding: '10px 14px', fontSize: '0.95rem' }}
                  />
                  {subjectSearch && (
                    <button 
                      onClick={() => setSubjectSearch('')}
                      style={{ background: 'none', border: 'none', color: 'var(--ink-500)', cursor: 'pointer', fontWeight: 800 }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <select 
                  value={subject} 
                  onChange={(e) => setSubject(e.target.value)}
                  style={{ width: '100%', height: '45px' }}
                >
                   {filteredSubjects.length > 0 ? (
                    filteredSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name.replace(/_/g, ' ')} {subjectSearch.trim() ? `(${s.year})` : ''}
                      </option>
                    ))
                  ) : (
                    <option disabled>No subjects found for "{subjectSearch}"</option>
                  )}
                </select>
              </div>
              <div className="form-group">
                <label>Difficulty</label>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                  <option value="easy">Beginner</option>
                  <option value="medium">Standard</option>
                  <option value="hard">Expert</option>
                </select>
              </div>
            </div>

            <button className="btn-primary" onClick={createRoom} disabled={loading} style={{ background: '#3b82f6', color: 'white', padding: '20px', fontSize: '1.2rem', borderRadius: '20px', fontWeight: 800, width: '100%', boxShadow: '0 10px 20px -5px rgba(59, 130, 246, 0.4)' }}>
               {loading ? 'Creating...' : '🚀 Host New Challenge'}
            </button>
          </div>

          <div className="quiz-v2-card" style={{ textAlign: 'center' }}>
            <h4 style={{ textTransform: 'uppercase', letterSpacing: '2px', color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Join Existing Room</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center' }}>
              <input
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                placeholder="ENTER 6-DIGIT CODE"
                className="chat-input"
                style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 900, letterSpacing: '4px', padding: '15px', borderRadius: '15px', flex: '1 1 200px', maxWidth: '300px' }}
              />
              <button className="btn-secondary" onClick={joinRoom} disabled={loading} style={{ padding: '0 40px', fontSize: '1.1rem', borderRadius: '15px' }}>
                JOIN
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="quiz-v2-active">
          <div className="quiz-status-bar">
            <div className="live-indicator">
              <div className="live-dot"></div>
              <span>Live Room</span>
            </div>
            {timeLeft !== null && (
              <div style={{ fontWeight: 900, fontSize: '1.2rem', color: timeLeft < 60 ? '#ef4444' : 'white' }}>
                ⏱️ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
            )}
            <button 
              onClick={() => { setRoomCode(''); setState(null); setResult(null); }}
              style={{ background: 'rgba(255, 255, 255, 0.1)', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
            >
              EXIT
            </button>
          </div>

          <div className="quiz-code-display">
             <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '2px', color: '#64748b' }}>INVITE OTHERS WITH CODE</span>
             <div className="quiz-code-text" onClick={() => { navigator.clipboard.writeText(roomCode); alert('Room code copied!'); }} style={{ cursor: 'pointer' }}>{roomCode}</div>
          </div>

          <div className="quiz-room__content">
            <div className="questions-container">
              {state?.questions.map((q, idx) => (
                <div key={idx} className="quiz-v2-card" style={{ marginBottom: '2rem', padding: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '1rem' }}>
                    <span style={{ fontWeight: 900, color: '#3b82f6', letterSpacing: '1px' }}>QUESTION {idx + 1}</span>
                  </div>
                  
                  <div style={{ fontSize: 'clamp(1.1rem, 3vw, 1.4rem)', lineHeight: 1.5, color: '#0f172a', fontWeight: 600, marginBottom: '2rem' }}>
                    <MathRenderer text={q.question_text} />
                  </div>
                  
                  <div className="options-v2-grid">
                    {q.options?.map((opt, i) => {
                      const letter = String.fromCharCode(65 + i);
                      const isSelected = answers[idx] === opt;
                      const cleanedOpt = opt.replace(/^(Option\s+[A-D][:.]\s*|[A-D][:.]\s*)/i, '').trim();
                      return (
                        <div 
                          key={i} 
                          className={`option-v2-btn ${isSelected ? 'selected' : ''}`}
                          onClick={() => setAnswers(prev => ({ ...prev, [idx]: opt }))}
                        >
                          <div className="option-indicator">{letter}</div>
                          <div style={{ fontSize: '1rem', fontWeight: 500 }}><MathRenderer text={cleanedOpt} /></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div style={{ margin: '4rem 0', textAlign: 'center' }}>
                {!result ? (
                  <button 
                    onClick={submitQuiz} 
                    disabled={loading} 
                    className="btn-primary"
                    style={{ width: '100%', maxWidth: '400px', padding: '25px', fontSize: '1.5rem', borderRadius: '25px', background: '#10b981', color: 'white', fontWeight: 900, boxShadow: '0 20px 30px -10px rgba(16, 185, 129, 0.4)' }}
                  >
                    {loading ? 'Submitting...' : 'FINISH & SUBMIT'}
                  </button>
                ) : (
                  <div className="quiz-v2-card" style={{ background: '#ecfdf5', borderColor: '#10b981' }}>
                    <h2 style={{ color: '#047857', fontWeight: 900, fontSize: '2rem' }}>CHALLENGE OVER</h2>
                    <div style={{ fontSize: '6rem', fontWeight: 900, color: '#059669', margin: '20px 0' }}>{result.percentage}%</div>
                    <p style={{ color: '#065f46', fontWeight: 700 }}>Ranked on Leaderboard!</p>
                  </div>
                )}
              </div>
            </div>

            <div className="quiz-sidebar">
              <div className="quiz-v2-card" style={{ padding: '1.5rem', position: 'sticky', top: '20px' }}>
                <h4 style={{ margin: '0 0 1.5rem 0', fontWeight: 900, letterSpacing: '1px', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem' }}>🏆 LEADERBOARD</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {state?.leaderboard.map((row, idx) => {
                    const isMe = row.player.toLowerCase() === playerName.toLowerCase();
                    return (
                      <div key={row.player} style={{ 
                        padding: '12px 15px',
                        borderRadius: '15px',
                        background: isMe ? '#eff6ff' : '#f8fafc',
                        border: '2px solid',
                        borderColor: isMe ? '#3b82f6' : '#e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.3s ease'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.2rem' }}>{getRankBadge(idx)}</span>
                          <span style={{ fontWeight: 800, color: isMe ? '#1e40af' : '#1e293b' }}>{row.player}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 900, color: '#0f172a' }}>{row.score}</div>
                          {row.submitted && <div style={{ fontSize: '0.6rem', color: '#10b981', fontWeight: 900 }}>DONE</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveQuiz;
