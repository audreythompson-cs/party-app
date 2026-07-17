import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { onLeaderboardChange, onPointHistoryChange, listenToGameState } from '../firebase/db';
import { TEAMS } from '../constants/teams';
import BottomNav from '../components/BottomNav';
import '../styles/views/Dashboard.css';

// Import Tabs
import HomeTab from './HomeTab';
import DonateTab from './DonateTab';
import GoalsTab from './GoalsTab';
import JeopardyBuzzerView from '../components/JeopardyBuzzerView';

export default function Dashboard() {
  const { userProfile, logout, teamsMap } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [showLogout, setShowLogout] = useState(false);
  const logoutTimerRef = useRef(null);
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

  useEffect(() => () => clearTimeout(logoutTimerRef.current), []);

  const revealLogout = () => {
    clearTimeout(logoutTimerRef.current);
    setShowLogout(true);
    logoutTimerRef.current = setTimeout(() => setShowLogout(false), 4000);
  };

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
            mode="donate"
          />
        );
      case 'points':
        return (
          <DonateTab
            profile={userProfile}
            leaderboard={leaderboard}
            pointHistory={pointHistory}
            mode="points"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div 
      className={`dashboard-page theme-${userTeam}`}
      style={{ '--player-team-color': playerTeam.color }}
    >
      <main className="app-container">
        <section className="dashboard-shell glass-panel is-active">
          <header className="dashboard-shell-header">
            <button className="player-name" onClick={revealLogout} aria-label="Show logout option">
              {userProfile?.name}
            </button>
            {showLogout && (
              <button onClick={logout} className="header-logout-btn animate-scale-up" aria-label="Log out">
                <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            )}
            <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} position="top" />
          </header>

          <div className="dashboard-content">
            {renderTabContent()}
          </div>
        </section>
      </main>
    </div>
  );
}
