import { useState, useEffect } from 'react';
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
  const { userProfile, teamsMap } = useAuth();
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
            <h2 className="player-name">{userProfile?.name}</h2>
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
