import { useState, useRef, useEffect } from 'react';
import { tutorAPI, questionsAPI } from '../services/api';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
  suggestions?: string[];
}

const TutorExplanation = ({ text }: { text: string }) => {
  const sections = text.split(/\*\*([^*]+)\*\*/g);
  
  // The split above will give us:
  // [pre-content, HEADER1, content1, HEADER2, content2, ...]
  
  const renderedSections = [];
  let header = "";
  
  for (let i = 0; i < sections.length; i++) {
    const part = sections[i].trim();
    if (!part) continue;

    if (i % 2 === 1) {
      // It's a header
      header = part;
    } else {
      // It's content
      if (header) {
        let content: any = part;
        // Clean up bullets within the content
        const lines = part.split('\n').map(line => {
             const cleanLine = line.trim().replace(/^[-*]\s*/, '');
             if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                 return <li key={line} className="tutor-li">{cleanLine}</li>;
             }
             return cleanLine ? <p key={line} className="tutor-p">{cleanLine}</p> : null;
        });

        renderedSections.push(
          <div key={header} className="tutor-section">
            <div className="tutor-section-header">
               {header === 'MAIN CONCEPT' && '🎯 '}
               {header === 'EXPLANATION' && '💡 '}
               {header === 'FAST FACT/TIP' && '✨ '}
               {header === 'SUMMARY' && '📝 '}
               {header}
            </div>
            <div className="tutor-section-body">
              {lines}
            </div>
          </div>
        );
        header = "";
      } else {
        // Just general text before any headers
        renderedSections.push(<p key={i} className="tutor-p">{part}</p>);
      }
    }
  }

  return <div className="tutor-explanation-card">{renderedSections}</div>;
};

export function StudyCoach() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: "Hello! I'm your AI Study Buddy. Ask me anything about your SHS subjects, and I'll explain it clearly for you. What would you like to learn today?",
      sender: 'ai',
      timestamp: Date.now(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('General');
  const [subjects, setSubjects] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const data = await questionsAPI.getSubjects();
        setSubjects(data.subjects || []);
      } catch (err) {
        console.error('Failed to load subjects', err);
      }
    };
    loadSubjects();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: textToSend,
      sender: 'user',
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await tutorAPI.ask(textToSend, subject);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.explanation,
        sender: 'ai',
        timestamp: Date.now(),
        suggestions: response.related_questions
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I encountered an error. Please try again or check your connection.",
        sender: 'ai',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="generator-section" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="generator-hero">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ fontSize: '2.5rem' }}>🎓</div>
          <div>
            <h2>Study With AI</h2>
            <p>Your interactive SHS tutor for instant, simplified explanations.</p>
          </div>
        </div>
      </div>

      <div className="form-group" style={{ maxWidth: '300px' }}>
        <label>Subject Context:</label>
        <select value={subject} onChange={(e) => setSubject(e.target.value)}>
          <option value="General">General SHS Topics</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="chat-container">
        <div className="messages-list">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-bubble ${msg.sender}`}>
              <div className="message-text">
                {msg.sender === 'ai' ? <TutorExplanation text={msg.text} /> : msg.text}
              </div>
              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="follow-up-suggestions">
                    <p style={{ width: '100%', fontSize: '0.8rem', opacity: 0.7, margin: '8px 0 4px' }}>Follow-up questions:</p>
                  {msg.suggestions.map((s, i) => (
                    <button 
                      key={i} 
                      className="suggestion-chip"
                      onClick={() => handleSend(s)}
                      disabled={loading}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="message-bubble ai">
              <div className="thinking-indicator">
                <div className="thinking-dot"></div>
                <div className="thinking-dot"></div>
                <div className="thinking-dot"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form 
          className="chat-input-area" 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <input
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything (e.g., 'Explain mitosis' or 'WASSCE tips for Core Maths')..."
            disabled={loading}
          />
          <button 
            type="submit" 
            className="btn-primary" 
            style={{ padding: '0 25px' }}
            disabled={loading || !input.trim()}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default StudyCoach;
