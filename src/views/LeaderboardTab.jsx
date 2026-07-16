import { STRINGS } from '../constants/strings';
import { useAuth } from '../context/AuthContext';
import '../styles/views/LeaderboardTab.css';

export default function LeaderboardTab({ leaderboard, currentUserId }) {
  const { teamsMap } = useAuth();
  
  const getRankBadge = (rank) => {
    return <span className="rank-number">#{rank}</span>;
  };

  const fallbackTeam = { 
    name: 'No Team', 
    color: '#cbd5e1', 
    glow: 'rgba(203,213,225,0.1)', 
    accentBg: 'rgba(203,213,225,0.01)' 
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
              const playerTeam = (teamsMap && teamsMap[player.team]) || fallbackTeam;

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

                  <div className="name-col">
                    <div className="name-wrapper">
                      <span className="player-name">{player.name}</span>
                      {isSelf && <span className="self-tag">{STRINGS.leaderboard.youSelfTag}</span>}
                    </div>
                  </div>

                  <div className="points-col">
                    <span className="player-points">{player.points ?? 0}</span>
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
