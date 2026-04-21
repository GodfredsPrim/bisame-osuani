import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { questionsAPI, Question, GeneratedQuestions } from '../services/api';
import MathRenderer from './MathRenderer';

interface ExamHistoryEntry {
  id: number;
  exam_type: string;
  subject: string;
  score_obtained: number;
  total_questions: number;
  percentage: number;
  created_at: string;
  details_json?: string;
}

interface SubjectOption {
  id: string;
  name: string;
  year: string;
}

const PAPER_ORDER = ['paper_1', 'paper_2', 'paper_3'] as const;

const PAPER_LABELS: Record<string, { title: string; subtitle: string; short: string }> = {
  paper_1: {
    title: 'Paper 1: Objective Test',
    subtitle: '40 randomized multiple-choice questions arranged in official-style exam order.',
    short: 'MCQ',
  },
  paper_2: {
    title: 'Paper 2: Theory',
    subtitle: 'Structured theory questions with stronger marking guides and exam-standard depth.',
    short: 'Theory',
  },
  paper_3: {
    title: 'Paper 3: Practical / Alternative',
    subtitle: 'Included only when the subject has an official practical or alternative paper.',
    short: 'Practical',
  },
};

export function AnalysisDashboard() {
  const [subject, setSubject] = useState('mathematics');
  const [selectedYear, setSelectedYear] = useState('Year 1');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showAnswers, setShowAnswers] = useState(false);
  const [studentAnswers, setStudentAnswers] = useState<Record<number, string>>({});
  const [examResult, setExamResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [error, setError] = useState('');
  const [mockTimeLimit, setMockTimeLimit] = useState(120);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [examHistory, setExamHistory] = useState<ExamHistoryEntry[]>([]);
  const [generationMeta, setGenerationMeta] = useState<GeneratedQuestions | null>(null);
  const [subjectSearch, setSubjectSearch] = useState('');

  const availableYears = useMemo(() => {
    const years = Array.from(new Set(subjects.map((item) => item.year))).sort();
    if (!years.includes('Year 3') && subjects.length > 0) {
      years.push('Year 3');
    }
    return years;
  }, [subjects]);

  const filteredSubjects = useMemo(() => {
    let list = selectedYear === 'Year 3'
      ? Array.from(new Map(subjects.map((item) => [item.name, item])).values())
      : subjects.filter((item) => item.year === selectedYear);
    
    if (subjectSearch.trim()) {
      list = list.filter(s => s.name.toLowerCase().includes(subjectSearch.toLowerCase()));
    }
    
    return list;
  }, [selectedYear, subjects, subjectSearch]);

  const activeSubjectLabel = useMemo(
    () => filteredSubjects.find((item) => item.id === subject)?.name || subject,
    [filteredSubjects, subject]
  );

  const organizedPapers = useMemo(() => generationMeta?.organized_papers || {}, [generationMeta]);

  const paperSections = useMemo(() => {
    return PAPER_ORDER.map((paperKey) => ({
      key: paperKey,
      ...PAPER_LABELS[paperKey],
      questions: organizedPapers[paperKey] || [],
    })).filter((section) => section.questions.length > 0);
  }, [organizedPapers]);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const data = await questionsAPI.getSubjects();
        const subjectList = data.subjects || [];
        setSubjects(Array.isArray(subjectList) ? subjectList : []);

        if (Array.isArray(subjectList) && subjectList.length > 0) {
          const firstYear = subjectList.find((item: SubjectOption) => item.year === 'Year 1')?.year || subjectList[0].year;
          setSelectedYear(firstYear);
          const firstForYear = subjectList.find((item: SubjectOption) => item.year === firstYear);
          if (firstForYear) {
            setSubject(firstForYear.id);
          }
        }

        try {
          const hist = await questionsAPI.getExamHistory();
          setExamHistory(hist.filter((item: any) => item.exam_type === 'likely_wassce'));
        } catch {
          setExamHistory([]);
        }

        setError('');
      } catch (fetchError) {
        console.error('Error fetching subjects:', fetchError);
        setError('Could not load subjects.');
      }
    };

    fetchSubjects();
  }, []);

  useEffect(() => {
    if (!subjects.length) return;
    const firstForYear = subjects.find((item) => item.year === selectedYear);
    if (firstForYear) {
      setSubject(firstForYear.id);
    }
  }, [selectedYear, subjects]);

  const handleGenerate = async () => {
    if (!subject) {
      alert('Please select a subject');
      return;
    }

    setLoading(true);
    setError('');
    setQuestions([]);
    setGenerationMeta(null);
    setShowAnswers(false);
    setStudentAnswers({});
    setExamResult(null);

    try {
      const result = await questionsAPI.generateProfessionalWassce({
        subject,
        year: selectedYear,
        question_type: 'standard',
      });

      const orderedQuestions = PAPER_ORDER.flatMap((paperKey) => result.organized_papers?.[paperKey] || []);
      setQuestions(orderedQuestions.length ? orderedQuestions : result.questions);
      setGenerationMeta(result);
    } catch (generationError) {
      console.error('Error generating paper:', generationError);
      const backendMessage = axios.isAxiosError(generationError)
        ? generationError.response?.data?.detail || generationError.message
        : 'Failed to generate paper.';
      setError(backendMessage);
    } finally {
      setLoading(false);
    }
  };

  const startSimulation = () => {
    setIsSimulating(true);
    setStudentAnswers({});
    setExamResult(null);
    setShowAnswers(false);
    setTimeLeft(mockTimeLimit * 60);
    setTimerActive(true);

    try {
      document.documentElement.requestFullscreen().catch((fullscreenError) => {
        console.warn('Fullscreen request denied:', fullscreenError);
      });
    } catch (fullscreenError) {
      console.warn('Fullscreen API error:', fullscreenError);
    }
  };

  const stopSimulation = () => {
    setTimerActive(false);
    setTimeLeft(null);
    setIsSimulating(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((exitError) => console.warn(exitError));
    }
  };

  const submitExamGrading = async () => {
    setIsSubmitting(true);
    try {
      const items = questions.map((question, index) => ({
        question_text: question.question_text,
        question_type: question.question_type,
        correct_answer: question.correct_answer,
        explanation: question.explanation,
        options: question.options,
        student_answer: studentAnswers[index] || '',
      }));

      const result = await questionsAPI.markPractice(items, 'simulation_user', subject);
      setExamResult(result);
      setShowAnswers(true);

      try {
        await questionsAPI.saveExamHistory({
          exam_type: 'likely_wassce',
          subject,
          score_obtained: result.score_obtained,
          total_questions: result.total_questions,
          percentage: result.percentage,
          details_json: JSON.stringify({
            results: result.results,
            questions,
            subject,
            selectedYear,
            organized_papers: generationMeta?.organized_papers,
          }),
        });
      } catch (historyError) {
        console.error('Failed to save history', historyError);
      }
    } catch (submitError) {
      console.error('Error marking practice:', submitError);
      alert('Error submitting exam for grading.');
    } finally {
      setIsSubmitting(false);
      stopSimulation();
    }
  };

  const handleViewHistory = (entry: ExamHistoryEntry) => {
    try {
      if (!entry.details_json) return;
      const data = JSON.parse(entry.details_json);
      if (Array.isArray(data)) {
        alert('This history item was saved in an older format and cannot be viewed instantly.');
        return;
      }

      const restoredQuestions = data.questions || [];
      setQuestions(restoredQuestions);
      setGenerationMeta((prev) => ({
        ...(prev || {
          questions: restoredQuestions,
          generation_time: 0,
          model_used: 'history_restore',
        }),
        questions: restoredQuestions,
        organized_papers: data.organized_papers || prev?.organized_papers,
      }));
      setExamResult({
        results: data.results,
        score_obtained: entry.score_obtained,
        total_questions: entry.total_questions,
        percentage: entry.percentage,
      });
      setSubject(data.subject || entry.subject);
      setSelectedYear(data.selectedYear || 'Year 1');
      setShowAnswers(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (parseError) {
      console.error('Failed to parse history details', parseError);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (isSimulating && !document.fullscreenElement && !examResult) {
        alert('Restricted mode violation: Fullscreen exited. Auto-submitting exam now.');
        submitExamGrading();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isSimulating, examResult, studentAnswers]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (timerActive && timeLeft !== null && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((previous) => {
          if (previous !== null && previous <= 1) {
            clearInterval(interval);
            submitExamGrading();
            return 0;
          }
          return previous !== null ? previous - 1 : null;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timeLeft]);

  const renderQuestionCard = (question: Question, globalIndex: number, labelPrefix: string) => (
    <article key={`${labelPrefix}-${globalIndex}`} className="question-card likely-question-card">
      <div className="likely-question-card__head">
        <span className="likely-question-card__label">{labelPrefix}</span>
        <span className="likely-question-card__type">
          {question.options?.length ? 'Multiple Choice' : 'Theory'}
        </span>
      </div>

      <div className="likely-question-card__body">
        <strong><MathRenderer text={question.question_text} /></strong>
      </div>

      <div className="interactive-answer">
        {question.options && question.options.length > 0 ? (
          <div className="options" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '15px' }}>
            {question.options.map((option, index) => {
              const letter = String.fromCharCode(65 + index);
              const cleanedOption = option.replace(/^(Option\s+[A-D][:.]\s*|[A-D][:.]\s*)/i, '').trim();
              return (
                <label
                  key={index}
                  className="option"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    padding: '10px',
                    background: studentAnswers[globalIndex] === letter ? '#e6f7ff' : '#f9f9f9',
                    borderRadius: '6px',
                    border: studentAnswers[globalIndex] === letter ? '1px solid #1890ff' : '1px solid transparent',
                  }}
                >
                  <input
                    type="radio"
                    name={`likely-question-${globalIndex}`}
                    value={letter}
                    checked={studentAnswers[globalIndex] === letter}
                    onChange={(event) => setStudentAnswers((prev) => ({ ...prev, [globalIndex]: event.target.value }))}
                  />
                  <span>{letter}: <MathRenderer text={cleanedOption} /></span>
                </label>
              );
            })}
          </div>
        ) : (
          <textarea
            placeholder="Type your detailed answer here... (Show all workings for sub-parts like (a)(i), (b))"
            rows={8}
            style={{
              width: '100%',
              marginTop: '15px',
              padding: '12px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              fontFamily: 'inherit',
              fontSize: '1rem',
            }}
            value={studentAnswers[globalIndex] || ''}
            onChange={(event) => setStudentAnswers((prev) => ({ ...prev, [globalIndex]: event.target.value }))}
          />
        )}
      </div>

      {showAnswers && (
        <div className="answer-section" style={{ marginTop: '20px', padding: '15px', background: '#f0fdf4', borderRadius: '6px', borderLeft: '4px solid #10b981' }}>
          {examResult?.results?.[globalIndex] && (
            <div
              style={{
                marginBottom: '10px',
                padding: '8px',
                background: examResult.results[globalIndex].is_correct ? '#d1fae5' : '#fee2e2',
                borderRadius: '4px',
              }}
            >
              <strong>Score:</strong> {examResult.results[globalIndex].score * 100}% | <strong>Feedback:</strong> {examResult.results[globalIndex].feedback}
            </div>
          )}
          <p><strong>Expected Answer/Rubric:</strong> <MathRenderer text={question.correct_answer || 'See explanation'} /></p>
          <p><strong>Explanation:</strong> <MathRenderer text={question.explanation} /></p>
        </div>
      )}
    </article>
  );

  return (
    <div className={`analysis-section ${isSimulating ? 'simulating' : ''}`} style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {!isSimulating && (
        <div className="generator-hero">
          <h2>fun2learn online WASSCE Studio</h2>
          <p>
            {selectedYear === 'Year 3'
              ? 'Year 3 combines Year 1 and Year 2 coverage, delivers 40 MCQs first, then standard theory and practical sections where the subject supports them. When past papers are missing, the paper is built directly from scanned textbook material.'
              : 'Each paper follows official flow: 40 MCQs first, theory next, and practical only when the subject supports it, with randomized topic coverage across generations.'}
          </p>
        </div>
      )}

      {loading && (
        <div className="likely-loading-modal" role="status" aria-live="polite" aria-label="Generating likely WASSCE paper">
          <div className="likely-loading-modal__card">
            <div className="likely-loading-modal__spinner" />
            <h3>Generating Likely WASSCE Paper</h3>
            <p>We are assembling 40 objectives, strengthening theory and practical sections, and randomizing topic coverage for a sharper exam-style paper.</p>
            <div className="generation-caution generation-caution--modal">
              This can take about 30 to 90 seconds depending on subject depth and how much material needs to be assembled.
            </div>
            <span className="likely-loading-modal__hint">{activeSubjectLabel} | {selectedYear}</span>
          </div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {isSimulating ? (
        <div className="sim-exit-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#101923', color: '#fff', padding: '15px 25px', borderRadius: '8px', position: 'sticky', top: 0, zIndex: 1000, marginBottom: '20px' }}>
          <span><strong>Subject:</strong> {activeSubjectLabel}</span>
          <span><strong>Progress:</strong> {Object.keys(studentAnswers).length} / {questions.length}</span>
          {timeLeft !== null && (
            <span style={{ fontWeight: 'bold', color: timeLeft < 300 ? '#ff4d4f' : '#fff' }}>
              Time Left: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </span>
          )}
          <button onClick={submitExamGrading} disabled={isSubmitting} className="btn-primary" style={{ background: '#52c41a', border: 'none' }}>
            {isSubmitting ? 'Grading...' : 'Submit Paper'}
          </button>
        </div>
      ) : (
        <>
          <div className="form-grid generator-panel">
            <div className="form-group">
              <label>Select Year</label>
              <select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}>
                {availableYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ marginBottom: 0 }}>Select Subject</label>
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={subjectSearch}
                  onChange={(e) => setSubjectSearch(e.target.value)}
                  className="chat-input"
                  style={{ width: '120px', padding: '4px 10px', fontSize: '0.85rem' }}
                />
              </div>
              <select value={subject} onChange={(event) => setSubject(event.target.value)}>
                {filteredSubjects.length > 0 ? (
                  filteredSubjects.map((item) => (
                    <option key={item.id} value={item.id}>{item.name.replace(/_/g, ' ')}</option>
                  ))
                ) : (
                  <option disabled>No subjects found</option>
                )}
              </select>
            </div>
            <div className="form-group">
              <label>Time Limit (mins)</label>
              <input type="number" min="1" value={mockTimeLimit} onChange={(event) => setMockTimeLimit(parseInt(event.target.value) || 1)} />
            </div>
          </div>

          <div className="likely-actions">
            <div className="generation-caution" role="note">
              Likely WASSCE generation is heavier than normal practice. Expect roughly 30 to 90 seconds for full paper assembly, especially when extra theory or practical sections need to be built from subject materials.
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="btn-primary"
              style={{
                flex: 1,
                padding: '18px',
                fontSize: '1.05rem',
                background: 'linear-gradient(135deg, #10253d 0%, #1e3a8a 100%)',
                boxShadow: '0 10px 15px -3px rgba(30, 58, 138, 0.3)',
              }}
            >
              {loading ? 'Building Likely WASSCE Paper...' : 'Generate Likely WASSCE Paper'}
            </button>
            {questions.length > 0 && (
              <>
                <button onClick={startSimulation} className="btn-secondary likely-actions__secondary">
                  Official Hall Simulation
                </button>
                <button onClick={() => window.print()} className="btn-secondary likely-actions__tertiary">
                  Print / Export Layout
                </button>
              </>
            )}
          </div>

          {generationMeta && (
            <section className="likely-structure-panel">
              <div className="likely-structure-panel__head">
                <div>
                  <h3>Exam Structure</h3>
                  <p>The generated paper is organized exactly in exam order.</p>
                </div>
                <span className="source-badge source-exam_structured">
                  Exam Ready
                </span>
              </div>
              <div className="likely-structure-grid">
                {paperSections.map((section) => (
                  <div key={section.key} className="likely-structure-card">
                    <span className="likely-structure-card__tag">{section.short}</span>
                    <strong>{section.title}</strong>
                    <p>{section.subtitle}</p>
                    <span className="likely-structure-card__count">{section.questions.length} questions</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {examResult && !isSimulating && (
        <div className="exam-results-card" style={{ background: 'linear-gradient(135deg, #0b7a4b, #10a261)', color: 'white', padding: '30px', borderRadius: '15px', marginBottom: '30px', textAlign: 'center', boxShadow: '0 10px 25px rgba(11, 122, 75, 0.3)' }}>
          <h2 style={{ color: '#fff' }}>Simulation Official Result</h2>
          <h1 style={{ fontSize: '4rem', margin: '10px 0' }}>{examResult.percentage}%</h1>
          <p style={{ fontSize: '1.2rem' }}>Answered {examResult.total_questions} questions | Score: {examResult.score_obtained}</p>
          <p style={{ marginTop: '15px', opacity: 0.9 }}>Review your answers below in the same paper sequence.</p>
        </div>
      )}

      <div className="questions-list">
        {paperSections.map((section) => {
          const previousCount = paperSections
            .slice(0, paperSections.findIndex((item) => item.key === section.key))
            .reduce((sum, item) => sum + item.questions.length, 0);

          return (
            <section key={section.key} className="likely-paper-block">
              <div className="likely-paper-block__head">
                <div>
                  <h3>{section.title}</h3>
                  <p>{section.subtitle}</p>
                </div>
                <span className="likely-paper-block__badge">{section.questions.length} questions</span>
              </div>
              <div className="likely-paper-block__list">
                {section.questions.map((question, index) =>
                  renderQuestionCard(question, previousCount + index, `${section.short} Question ${index + 1}`)
                )}
              </div>
            </section>
          );
        })}
      </div>

      {!isSimulating && examHistory.length > 0 && (
        <div style={{ marginTop: '40px', padding: '20px', background: '#f8fafc', borderRadius: '12px' }}>
          <h3>Past Likely WASSCE Sessions</h3>
          <div style={{ display: 'grid', gap: '15px', marginTop: '15px' }}>
            {examHistory.map((entry) => (
              <div
                key={entry.id}
                className="history-item-card"
                onClick={() => handleViewHistory(entry)}
                style={{
                  padding: '15px',
                  background: '#fff',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseOver={(event) => {
                  event.currentTarget.style.transform = 'translateY(-2px)';
                  event.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                }}
                onMouseOut={(event) => {
                  event.currentTarget.style.transform = 'none';
                  event.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div>
                  <strong style={{ display: 'block', fontSize: '1.1rem' }}>{entry.subject.replace(/_/g, ' ').toUpperCase()}</strong>
                  <span style={{ color: '#64748b' }}>{new Date(entry.created_at).toLocaleString()} • View Results →</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: entry.percentage >= 50 ? '#10b981' : '#ef4444' }}>
                    {entry.percentage}%
                  </div>
                  <span style={{ color: '#64748b' }}>{entry.score_obtained} / {entry.total_questions} pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
