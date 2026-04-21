import React, { useState, useEffect } from 'react';
import { adminAPI, type Competition } from '../services/api';

export const CompetitionPortal: React.FC = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [registeringId, setRegisteringId] = useState<number | null>(null);

  const fetchCompetitions = async () => {
    try {
      const data = await adminAPI.listCompetitions();
      setCompetitions(data);
    } catch (err) {
      console.error('Failed to fetch competitions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetitions();
  }, []);

  const handleRegister = async (compId: number) => {
    setRegisteringId(compId);
    try {
      await adminAPI.registerForCompetition(compId);
      alert('Success! You are now registered for this competition. Keep an eye on the start date!');
      fetchCompetitions();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to register.');
    } finally {
      setRegisteringId(null);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
      <div className="pulse-loader"></div>
      <p style={{ marginLeft: '15px', fontWeight: 600 }}>Loading Announcements...</p>
    </div>
  );

  return (
    <div className="competition-portal" style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px' }}>
      <header style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 style={{ fontSize: '3.5rem', fontWeight: 900, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '15px', letterSpacing: '-1px' }}>Monthly Challenges</h1>
        <p style={{ color: '#64748b', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>Stay updated with the latest rewards, announcements, and competition details.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '30px' }}>
        {competitions.length > 0 ? competitions.map((comp) => (
          <div key={comp.id} className="glass-card" style={{ 
            padding: '40px', 
            borderRadius: '32px', 
            border: '1px solid rgba(226, 232, 240, 0.8)',
            background: 'white',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease'
          }}>
            <div style={{ position: 'absolute', top: 0, right: 0, padding: '12px 24px', background: comp.pdf_url ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: comp.pdf_url ? '#059669' : '#d97706', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', borderBottomLeftRadius: '20px', zIndex: 2 }}>
              {comp.pdf_url ? '🚀 Live' : '⏳ Pending'}
            </div>
            
            {comp.image_url ? (
              <div style={{ margin: '-40px -40px 20px -40px', height: '200px', overflow: 'hidden' }}>
                <img src={comp.image_url} alt={comp.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : (
                <div style={{ height: '20px' }}></div>
            )}

            <h3 style={{ fontSize: '1.8rem', color: '#0f172a', fontWeight: 800 }}>{comp.title}</h3>
            <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: 1.6 }}>{comp.description}</p>
            
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
              <div style={{ marginBottom: '15px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px' }}>🏆 Grand Prize</span>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#3b82f6' }}>{comp.prize}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                   <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Event Window</span>
                   <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#475569' }}>{new Date(comp.start_date).toLocaleDateString()} - {new Date(comp.end_date).toLocaleDateString()}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
              {comp.pdf_url ? (
                <>
                  <a 
                    href={comp.pdf_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn-secondary" 
                    style={{ flex: 1, textAlign: 'center', padding: '15px', borderRadius: '16px', background: '#f1f5f9', color: '#0f172a', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none' }}
                  >
                    📄 View Paper
                  </a>
                  <button 
                    className="btn-primary" 
                    style={{ flex: 1, padding: '15px', borderRadius: '16px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.9rem' }}
                    onClick={() => handleRegister(comp.id)}
                    disabled={registeringId === comp.id}
                  >
                    {registeringId === comp.id ? 'Loading...' : 'Register Now'}
                  </button>
                </>
              ) : (
                <button 
                  className="btn-primary" 
                  style={{ width: '100%', padding: '15px', borderRadius: '16px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px dashed #3b82f6', fontWeight: 700, fontSize: '0.9rem', cursor: 'default' }}
                  disabled
                >
                  ⏳ Waiting for Paper Drop
                </button>
              )}
            </div>
          </div>
        )) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '100px 20px' }}>
            <div style={{ fontSize: '5rem', marginBottom: '30px' }}>🗓️</div>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b' }}>No current announcements</h2>
            <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto' }}>Check back soon for new rewards and updates!</p>
          </div>
        )}
      </div>
    </div>
  );
};
