import { useState, useEffect } from 'react';
import { STRINGS } from '../constants/strings';
import { onUserGoalsChange, claimGoal } from '../firebase/db';
import '../styles/views/HomeTab.css';

export default function HomeTab({ profile, rank, totalPlayers, pointHistory }) {
  const [userGoals, setUserGoals] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [revealed, setRevealed] = useState(() => {
    return localStorage.getItem(`side_quest_revealed_${profile?.uid}`) === 'true';
  });

  useEffect(() => {
    if (profile?.uid) {
      const unsubscribe = onUserGoalsChange(profile.uid, (data) => {
        setUserGoals(data);
      });
      return () => unsubscribe();
    }
  }, [profile?.uid]);

  const handleReveal = () => {
    setRevealed(true);
    localStorage.setItem(`side_quest_revealed_${profile?.uid}`, 'true');
  };

  const handleClaimQuest = async () => {
    if (!profile?.sideQuest) return;
    setSubmitting(true);
    try {
      await claimGoal(profile.uid, profile.name, 'side_quest', 'Side Quest: ' + profile.sideQuest, 150);
    } catch (err) {
      console.error(err);
      alert('Failed to claim side quest points: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const questStatus = userGoals['side_quest']?.status || 'available'; // 'available' | 'completed'

  return (
    <div className="home-tab animate-fade-in">
      {/* Stats Cards Row */}
      <div className="stats-row">
        {/* Points Card */}
        <div className="glass-panel stat-card points-card">
          <span className="stat-label">{STRINGS.dashboard.pointsTitle}</span>
          <span className="stat-value animate-text-glow">{profile.points ?? 0}</span>
          <span className="stat-unit">{STRINGS.leaderboard.pointsUnit}</span>
        </div>

        {/* Rank Card */}
        <div className="glass-panel stat-card rank-card">
          <span className="stat-label">{STRINGS.dashboard.rankTitle}</span>
          <span className="stat-value">
            #{rank}
          </span>
          <span className="stat-sub">{STRINGS.dashboard.guestsSub.replace('{total}', totalPlayers)}</span>
        </div>
      </div>

      {/* Secret Side Quest Section */}
      <div className="glass-panel quest-section">
        <div className="quest-header">
          <span className="quest-label">🕵️‍♂️ Secret Side Quest</span>
          {profile?.sideQuest && questStatus === 'completed' && <span className="quest-status completed">Completed</span>}
        </div>
        
        {!profile?.sideQuest ? (
          <div className="quest-reveal-container" style={{ padding: '10px 0' }}>
            <p className="quest-reveal-text" style={{ fontSize: '13px', fontStyle: 'italic' }}>
              No secret quest assigned yet. Ask the host Audrey to assign you one!
            </p>
          </div>
        ) : !revealed ? (
          <div className="quest-reveal-container">
            <p className="quest-reveal-text">You have been assigned a secret side quest for this party!</p>
            <button 
              onClick={handleReveal} 
              className="btn-primary reveal-btn animate-glow"
            >
              🔓 Reveal My Quest
            </button>
          </div>
        ) : (
          <div className="quest-content animate-fade-in">
            <p className="quest-description">“{profile.sideQuest}”</p>
            <p className="quest-instructions">
              Complete this quest without letting other guests know it's your assignment! Once done, claim your reward.
            </p>
            
            <div className="quest-actions">
              {questStatus === 'available' ? (
                <button
                  onClick={handleClaimQuest}
                  disabled={submitting}
                  className="btn-primary claim-quest-btn animate-glow"
                >
                  {submitting ? 'Claiming...' : 'Claim 150 Points'}
                </button>
              ) : (
                <div className="quest-badge completed">
                  🏆 Quest Completed (+150 pts)
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Point History Log */}
      <div className="history-section glass-panel">
        <h3>{STRINGS.dashboard.historyTitle}</h3>
        
        {pointHistory.length === 0 ? (
          <div className="no-history-state">
            <span className="no-history-icon">✨</span>
            <p>{STRINGS.dashboard.noHistory}</p>
          </div>
        ) : (
          <div className="history-list">
            {pointHistory.map((item) => {
              const isPositive = item.amount > 0;
              return (
                <div key={item.id} className="history-item animate-slide-in">
                  <div className="item-details">
                    <span className="item-description">{item.description}</span>
                    <span className="item-time">{formatTime(item.timestamp)}</span>
                  </div>
                  <span className={`item-amount ${isPositive ? 'positive' : 'negative'}`}>
                    {isPositive ? '+' : ''}{item.amount}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
