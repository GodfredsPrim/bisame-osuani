import React, { useState, useEffect } from 'react';
import { adminAPI, type LeaderboardEntry } from '../services/api';

export const GlobalLeaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const data = await adminAPI.getLeaderboard();
        setLeaderboard(data);
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>🥇 Calculating Rankings...</div>;

  return (
    <div className="leaderboard-portal glass-card" style={{ maxWidth: '800px', margin: '30px auto', padding: '40px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
         <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🏆 Global Hall of Fame</h1>
         <p style={{ color: '#64748b' }}>The top performing students in Ghana based on all-time practice scores.</p>
      </div>

      <div className="leaderboard-list">
        {leaderboard.map((entry) => (
          <div 
            key={entry.rank} 
            className={`leaderboard-row rank-${entry.rank <= 3 ? entry.rank : 'default'}`}
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '20px',
              borderRadius: '16px',
              marginBottom: '10px',
              background: entry.rank === 1 ? 'linear-gradient(90deg, rgba(234, 179, 8, 0.1), transparent)' : 'rgba(255,255,255,0.05)',
              border: entry.rank === 1 ? '1px solid #eab308' : '1px solid rgba(255,255,255,0.1)',
              transition: 'transform 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%', 
                background: entry.rank === 1 ? '#eab308' : entry.rank === 2 ? '#94a3b8' : entry.rank === 3 ? '#b45309' : '#1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 800,
                fontSize: '1.2rem'
              }}>
                {entry.rank}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1e293b' }}>
                    {entry.player_name}
                    {entry.is_online && <span style={{ marginLeft: '10px', width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', display: 'inline-block' }}></span>}
                </div>
                {entry.rank === 1 && <span style={{ fontSize: '0.75rem', color: '#eab308', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>Grand Champion ✨</span>}
              </div>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981' }}>{entry.total_points.toLocaleString()}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Total Points</div>
            </div>
          </div>
        ))}

        {leaderboard.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            No rankings yet. Start practicing to get on the board!
          </div>
        )}
      </div>
    </div>
  );
};
