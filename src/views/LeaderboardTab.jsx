import { STRINGS } from '../constants/strings';
import { TEAMS } from '../constants/teams';
import '../styles/views/LeaderboardTab.css';

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
                      {isSelf && <span className="self-tag">{STRINGS.leaderboard.youSelfTag}</span>}
                    </div>
                    <span className="player-team-label" style={{ color: playerTeam.color }}>
                      {playerTeam.name}
                    </span>
                  </div>

                  <div className="points-col">
                    <span className="player-points">{player.points ?? 0}</span>
                    <span className="points-label">{STRINGS.leaderboard.pointsUnit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>


    </div>
  );
}
