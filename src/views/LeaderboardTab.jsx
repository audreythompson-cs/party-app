import { STRINGS } from '../constants/strings';
import { TEAMS } from '../constants/teams';

export default function LeaderboardTab({ leaderboard, currentUserId }) {
  const getRankBadge = (rank) => {
    if (rank === 1) return <span className="rank-badge gold">👑</span>;
    if (rank === 2) return <span className="rank-badge silver">🥈</span>;
    if (rank === 3) return <span className="rank-badge bronze">🥉</span>;
    return <span className="rank-number">{rank}</span>;
  };

  return (
    <div className="leaderboard-tab animate-fade-in">
      <div className="glass-panel leaderboard-container">
        <div className="leaderboard-header">
          <h3>{STRINGS.leaderboard.title}</h3>
          <p className="subtitle">{STRINGS.leaderboard.subtitle}</p>
        </div>

        {leaderboard.length === 0 ? (
          <div className="empty-state">
            <p>{STRINGS.leaderboard.noPlayers}</p>
          </div>
        ) : (
          <div className="players-list">
            {leaderboard.map((player, index) => {
              const rank = index + 1;
              const isSelf = player.uid === currentUserId;
              const playerTeam = TEAMS[player.team] || TEAMS.teal;

              return (
                <div 
                  key={player.uid} 
                  className={`player-row animate-slide-in delay-${Math.min(rank, 10)} ${isSelf ? 'self-row' : ''}`}
                  style={{
                    '--player-accent': playerTeam.color,
                    '--player-glow': playerTeam.glow,
                    '--player-bg': playerTeam.accentBg
                  }}
                >
                  <div className="rank-col">
                    {getRankBadge(rank)}
                  </div>

                  <div className="avatar-col">
                    <div className="leaderboard-avatar-container">
                      {player.photoUrl ? (
                        <img 
                          src={player.photoUrl} 
                          alt={player.name} 
                          className="leaderboard-avatar-img cartoonified-sm" 
                        />
                      ) : (
                        <div className="leaderboard-avatar-placeholder">👤</div>
                      )}
                    </div>
                  </div>

                  <div className="name-col">
                    <div className="name-wrapper">
                      <span className="player-name">{player.name}</span>
                      {isSelf && <span className="self-tag">You</span>}
                    </div>
                    <span className="player-team-label" style={{ color: playerTeam.color }}>
                      {playerTeam.name}
                    </span>
                  </div>

                  <div className="points-col">
                    <span className="player-points">{player.points ?? 0}</span>
                    <span className="points-label">pts</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .leaderboard-tab {
          width: 100%;
        }

        .leaderboard-container {
          padding: 24px 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .leaderboard-header h3 {
          font-size: 18px;
          margin-bottom: 4px;
        }

        .leaderboard-header .subtitle {
          font-size: 13px;
          color: var(--text-muted);
          text-align: left;
          margin-bottom: 0;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: var(--text-muted);
        }

        .players-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 420px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .players-list::-webkit-scrollbar {
          width: 4px;
        }
        .players-list::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
        }

        /* Player row layout */
        .player-row {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-md);
          transition: all 0.2s ease;
          gap: 12px;
        }

        .player-row:hover {
          background: rgba(255, 255, 255, 0.04);
          transform: translateX(2px);
        }

        /* Current player card highlight */
        .self-row {
          background: var(--player-bg);
          border-color: var(--player-accent);
          box-shadow: 0 0 12px var(--player-glow);
        }

        /* Columns styling */
        .rank-col {
          width: 28px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .rank-badge {
          font-size: 18px;
        }

        .rank-number {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 14px;
          color: var(--text-muted);
        }

        .self-row .rank-number {
          color: var(--player-accent);
        }

        .avatar-col {
          display: flex;
          align-items: center;
        }

        .leaderboard-avatar-container {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.05);
          border: 1.5px solid var(--player-accent);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .leaderboard-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .cartoonified-sm {
          filter: contrast(1.2) saturate(1.6) brightness(1.05) url(#cartoon-filter);
        }

        .leaderboard-avatar-placeholder {
          font-size: 20px;
        }

        .name-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          text-align: left;
          gap: 2px;
        }

        .name-wrapper {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .player-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-bright);
        }

        .self-tag {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          background: var(--player-accent);
          color: #000;
          padding: 2px 5px;
          border-radius: 6px;
          letter-spacing: 0.05em;
          box-shadow: 0 0 5px var(--player-accent);
        }

        .player-team-label {
          font-size: 11px;
          font-weight: 500;
        }

        .points-col {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          line-height: 1.1;
        }

        .player-points {
          font-family: var(--font-heading);
          font-size: 18px;
          font-weight: 800;
          color: var(--text-bright);
        }

        .self-row .player-points {
          color: var(--player-accent);
          text-shadow: 0 0 8px var(--player-glow);
        }

        .points-label {
          font-size: 9px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}
