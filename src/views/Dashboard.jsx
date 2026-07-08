import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { onLeaderboardChange, onPointHistoryChange, listenToGameState } from '../firebase/db';
import BottomNav from '../components/BottomNav';

// Import Tabs
import HomeTab from './HomeTab';
import LeaderboardTab from './LeaderboardTab';
import DonateTab from './DonateTab';
import GoalsTab from './GoalsTab';
import JeopardyBuzzerView from '../components/JeopardyBuzzerView';

export default function Dashboard() {
  const { userProfile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [leaderboard, setLeaderboard] = useState([]);
  const [pointHistory, setPointHistory] = useState([]);
  const [gameState, setGameState] = useState(null);

  // Listen to Game State
  useEffect(() => {
    const unsubscribeGame = listenToGameState((data) => {
      setGameState(data);
    });
    return () => unsubscribeGame();
  }, []);

  // Listen to Leaderboard
  useEffect(() => {
    const unsubscribeLeaderboard = onLeaderboardChange((data) => {
      setLeaderboard(data);
    });
    return () => unsubscribeLeaderboard();
  }, []);

  // Listen to personal Point History
  useEffect(() => {
    if (userProfile?.uid) {
      const unsubscribeHistory = onPointHistoryChange(userProfile.uid, (data) => {
        setPointHistory(data);
      });
      return () => unsubscribeHistory();
    }
  }, [userProfile?.uid]);

  // Compute Rank
  const playerRankIndex = leaderboard.findIndex(player => player.uid === userProfile?.uid);
  const userRank = playerRankIndex !== -1 ? playerRankIndex + 1 : '-';
  const totalPlayers = leaderboard.length;

  // Apply Team Accent Styling to Dashboard view wrapper
  const userTeam = userProfile?.team || 'teal';

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        if (gameState?.activeGame === 'jeopardy') {
          return (
            <JeopardyBuzzerView
              gameState={gameState}
              profile={userProfile}
            />
          );
        }
        return (
          <HomeTab
            profile={userProfile}
            rank={userRank}
            totalPlayers={totalPlayers}
            pointHistory={pointHistory}
          />
        );
      case 'leaderboard':
        return (
          <LeaderboardTab
            leaderboard={leaderboard}
            currentUserId={userProfile?.uid}
          />
        );
      case 'goals':
        return (
          <GoalsTab
            profile={userProfile}
          />
        );
      case 'donate':
        return (
          <DonateTab
            profile={userProfile}
            leaderboard={leaderboard}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={`dashboard-page themed-background theme-${userTeam}`}>
      {/* Dashboard Top Header */}
      <header className="dashboard-header glass-panel">
        <div className="header-left">
          <div className="header-avatar-container">
            {userProfile?.photoUrl ? (
              <img 
                src={userProfile.photoUrl} 
                alt={userProfile.name} 
                className="header-avatar-img cartoonified-xs" 
              />
            ) : (
              <div className="header-avatar-placeholder">👤</div>
            )}
          </div>
          <div className="user-welcome">
            <span className="welcome-tag">Guest</span>
            <h2>{userProfile?.name}</h2>
          </div>
        </div>

        <button onClick={logout} className="logout-btn" aria-label="Sign Out">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </header>

      {/* Main Tab Content */}
      <main className="app-container">
        {renderTabContent()}
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <style>{`
        .dashboard-page {
          min-height: 100vh;
          min-height: 100svh;
          display: flex;
          flex-direction: column;
          background-color: var(--bg-dark);
        }

        .dashboard-header {
          position: sticky;
          top: 0;
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
          height: 72px;
          border-radius: 0 0 20px 20px;
          border-top: none;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 20px;
          z-index: 100;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-avatar-container {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 10px var(--accent-glow);
        }

        .header-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .cartoonified-xs {
          filter: contrast(1.2) saturate(1.6) brightness(1.05) url(#cartoon-filter);
        }

        .header-avatar-placeholder {
          font-size: 20px;
        }

        .user-welcome {
          display: flex;
          flex-direction: column;
          text-align: left;
        }

        .welcome-tag {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--accent);
        }

        .user-welcome h2 {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-bright);
        }

        .logout-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .logout-btn:hover {
          color: #ff6f61;
          background: rgba(255, 111, 97, 0.08);
        }

        .logout-btn:active {
          transform: scale(0.95);
        }
      `}</style>
    </div>
  );
}
