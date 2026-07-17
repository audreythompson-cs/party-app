import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { onLeaderboardChange, onPointHistoryChange, listenToGameState } from '../firebase/db';
import { TEAMS } from '../constants/teams';
import BottomNav from '../components/BottomNav';
import '../styles/views/Dashboard.css';

// Import Tabs
import HomeTab from './HomeTab';
import LeaderboardTab from './LeaderboardTab';
import DonateTab from './DonateTab';
import GoalsTab from './GoalsTab';
import JeopardyBuzzerView from '../components/JeopardyBuzzerView';

export default function Dashboard() {
  const { userProfile, logout, teamsMap } = useAuth();
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

  // Apply Team Accent Styling to Dashboard view wrapper
  const userTeam = userProfile?.team || 'blue';

  const fallbackTeam = { 
    name: 'No Team', 
    color: '#cbd5e1'
  };
  const playerTeam = (teamsMap && userProfile?.team && teamsMap[userProfile.team]) || TEAMS[userProfile?.team] || fallbackTeam;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeTab
            profile={userProfile}
          />
        );
      case 'jeopardy':
        return (
          <JeopardyBuzzerView
            gameState={gameState}
            profile={userProfile}
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
            pointHistory={pointHistory}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div 
      className={`dashboard-page theme-${userTeam}`}
      style={{ backgroundColor: playerTeam.color, background: playerTeam.color }}
    >
      {/* Dashboard Top Header */}
      <header className="dashboard-header glass-panel">
        <div className="header-left">
          <div className="user-welcome">
            <div className="user-info-row">
              <h2>{userProfile?.name}</h2>
              {playerTeam && (
                <span className="team-badge" style={{ backgroundColor: playerTeam.color }}>
                  {playerTeam.name}
                </span>
              )}
            </div>
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


    </div>
  );
}
