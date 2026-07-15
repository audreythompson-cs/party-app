import { STRINGS } from '../constants/strings';
import '../styles/views/HomeTab.css';

export default function HomeTab({ profile, rank, totalPlayers, pointHistory }) {
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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
