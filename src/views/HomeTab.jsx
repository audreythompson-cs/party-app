import { STRINGS } from '../constants/strings';

export default function HomeTab({ profile, rank, totalPlayers, pointHistory }) {
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    // Handle Firebase Timestamp or standard Date
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
          <span className="stat-unit">pts</span>
        </div>

        {/* Rank Card */}
        <div className="glass-panel stat-card rank-card">
          <span className="stat-label">{STRINGS.dashboard.rankTitle}</span>
          <span className="stat-value">
            #{rank}
          </span>
          <span className="stat-sub">of {totalPlayers} guests</span>
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

      <style>{`
        .home-tab {
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
        }

        .stats-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .stat-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px 15px;
          height: 140px;
          text-align: center;
        }

        .stat-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 6px;
        }

        .stat-value {
          font-family: var(--font-heading);
          font-size: 40px;
          font-weight: 800;
          color: var(--text-bright);
          line-height: 1.1;
        }

        .stat-unit {
          font-size: 12px;
          font-weight: 600;
          color: var(--accent);
          text-transform: uppercase;
          margin-top: 4px;
        }

        .stat-sub {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 6px;
        }

        .points-card {
          border-left: 4px solid var(--accent);
        }

        .rank-card {
          border-left: 4px solid #38bdf8; /* Soft blue secondary accent */
        }

        /* History Section styling */
        .history-section {
          padding: 22px 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          flex: 1;
        }

        .history-section h3 {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-bright);
        }

        .no-history-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
          gap: 10px;
        }

        .no-history-icon {
          font-size: 32px;
          animation: float 4s ease-in-out infinite;
        }

        .no-history-state p {
          font-size: 13px;
          color: var(--text-muted);
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 280px;
          overflow-y: auto;
          padding-right: 4px;
        }

        /* custom scrollbar */
        .history-list::-webkit-scrollbar {
          width: 4px;
        }
        .history-list::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
        }

        .history-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: var(--radius-md);
          transition: background 0.2s ease;
        }

        .history-item:hover {
          background: rgba(255, 255, 255, 0.04);
        }

        .item-details {
          display: flex;
          flex-direction: column;
          gap: 4px;
          text-align: left;
        }

        .item-description {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-bright);
        }

        .item-time {
          font-size: 11px;
          color: var(--text-muted);
        }

        .item-amount {
          font-family: var(--font-heading);
          font-size: 16px;
          font-weight: 700;
        }

        .item-amount.positive {
          color: #10b981; /* Green */
        }

        .item-amount.negative {
          color: #ef4444; /* Red */
        }
      `}</style>
    </div>
  );
}
