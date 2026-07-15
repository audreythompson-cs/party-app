import { useState, useEffect } from 'react';
import { 
  onLeaderboardChange, 
  onAllUserGoalsChange, 
  adjustPointsAdmin, 
  deleteGoalTemplate,
  onGoalsChange,
  addJeopardyCategory,
  deleteJeopardyCategory,
  onJeopardyCategoriesChange,
  listenToGameState,
  updateGameState,
  saveTeam,
  deleteTeam,
  createPlaceholderPlayer,
  deletePlayerAdmin,
  updatePlayerTeam,
  saveGoalTemplate,
  onPointHistoryChange,
  onAllCompletedGoals
} from '../firebase/db';
import { useAuth } from '../context/AuthContext';
import { STRINGS } from '../constants/strings';
import { auth } from '../firebase/config';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import '../styles/views/AdminDashboard.css';

export default function AdminDashboard() {
  const { teams, teamsMap } = useAuth();
  
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPasscode, setAdminPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [isFirebaseAuthed, setIsFirebaseAuthed] = useState(false);

  // Admin Sub-Page Navigation State
  const [adminView, setAdminView] = useState('menu'); // 'menu' | 'remote' | 'teams' | 'players' | 'quests' | 'jeopardy'

  // Admin Data State
  const [players, setPlayers] = useState([]);
  const [goalsList, setGoalsList] = useState([]);
  const [allCompletedGoals, setAllCompletedGoals] = useState([]);
  const [jeopardyCategories, setJeopardyCategories] = useState([]);
  const [gameState, setGameState] = useState(null);

  // Form State: Teams Page
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamColor, setNewTeamColor] = useState('#60a5fa');

  // Form State: Players Page
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerTeam, setNewPlayerTeam] = useState('');
  const [customPoints, setCustomPoints] = useState({}); // { userId: amount }
  const [customDesc, setCustomDesc] = useState({});   // { userId: desc }
  
  // Real-time Player History logs state
  const [activeHistoryUserId, setActiveHistoryUserId] = useState(null);
  const [playerHistoryLogs, setPlayerHistoryLogs] = useState([]);

  // Form State: Quests/Goals Page
  const [newQuestTitle, setNewQuestTitle] = useState('');
  const [newQuestDesc, setNewQuestDesc] = useState('');
  const [newQuestPoints, setNewQuestPoints] = useState('');
  const [newQuestRepeatable, setNewQuestRepeatable] = useState(false);

  // Editing Quest State
  const [editingQuestId, setEditingQuestId] = useState(null);
  const [editQuestTitle, setEditQuestTitle] = useState('');
  const [editQuestDesc, setEditQuestDesc] = useState('');
  const [editQuestPoints, setEditQuestPoints] = useState('');
  const [editQuestRepeatable, setEditQuestRepeatable] = useState(false);

  // Form State: Jeopardy Category Creator
  const [newCatName, setNewCatName] = useState('');
  const [clue100Q, setClue100Q] = useState('');
  const [clue100A, setClue100A] = useState('');
  const [clue200Q, setClue200Q] = useState('');
  const [clue200A, setClue200A] = useState('');
  const [clue300Q, setClue300Q] = useState('');
  const [clue300A, setClue300A] = useState('');
  const [clue400Q, setClue400Q] = useState('');
  const [clue400A, setClue400A] = useState('');
  const [clue500Q, setClue500Q] = useState('');
  const [clue500A, setClue500A] = useState('');

  // Fallback Team Definition
  const fallbackTeam = { 
    id: 'default', 
    name: 'No Team', 
    color: '#cbd5e1', 
    secondary: '#cbd5e1', 
    glow: 'rgba(203, 213, 225, 0.25)', 
    accentBg: 'rgba(203, 213, 225, 0.05)' 
  };

  // Monitor Firebase Auth state & log in anonymously behind the scenes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsFirebaseAuthed(true);
      } else {
        setIsFirebaseAuthed(false);
        signInAnonymously(auth).catch((err) => {
          console.error('Error authenticating admin session:', err);
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen to single player history logs when expanded
  useEffect(() => {
    if (activeHistoryUserId) {
      const unsubscribe = onPointHistoryChange(activeHistoryUserId, (data) => {
        setPlayerHistoryLogs(data);
      });
      return () => unsubscribe();
    } else {
      setPlayerHistoryLogs([]);
    }
  }, [activeHistoryUserId]);

  // Subscribe to collections once BOTH panel is unlocked and Firebase is authed
  useEffect(() => {
    if (isAdminAuthenticated && isFirebaseAuthed) {
      const unsubPlayers = onLeaderboardChange((data) => {
        setPlayers(data);
      });
      const unsubGoals = onGoalsChange((data) => {
        setGoalsList(data);
      });
      const unsubCompleted = onAllCompletedGoals((data) => {
        setAllCompletedGoals(data);
      });
      const unsubJeopardy = onJeopardyCategoriesChange((data) => {
        setJeopardyCategories(data);
      });
      const unsubGame = listenToGameState((data) => {
        setGameState(data);
      });

      return () => {
        unsubPlayers();
        unsubGoals();
        unsubCompleted();
        unsubJeopardy();
        unsubGame();
      };
    }
  }, [isAdminAuthenticated, isFirebaseAuthed]);

  // Check Admin Login
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPasscode.trim().toUpperCase() === 'ADMIN2026') {
      setIsAdminAuthenticated(true);
      setPasscodeError('');
    } else {
      setPasscodeError(STRINGS.admin.gateError);
    }
  };

  // Switch TV View Remote Action
  const handleSwitchScreen = async (screen) => {
    if (screen === 'welcome') {
      await updateGameState({ activeGame: 'welcome', welcomeState: null });
    } else if (screen === 'jeopardy') {
      const currentJeopardy = gameState?.jeopardy || {
        activeClue: null,
        buzzedPlayerId: null,
        buzzedPlayerName: null,
        buzzedTimestamp: null,
        buzzerLocked: false,
        completedClues: [],
        failedPlayers: []
      };
      await updateGameState({ activeGame: 'jeopardy', jeopardy: currentJeopardy });
    } else if (screen === 'finale') {
      await updateGameState({ activeGame: 'finale', finaleStep: 0 });
    } else if (screen === 'goodbye') {
      await updateGameState({ activeGame: 'goodbye' });
    } else {
      await updateGameState({ activeGame: null, welcomeState: null, finaleStep: null });
    }
  };

  const handleReleaseBalloonsAdmin = async () => {
    await updateGameState({ welcomeState: 'released' });
  };

  const handleSelectClueAdmin = async (cat, clueIndex, clue) => {
    const clueId = `${cat.id}_${clue.points}`;
    if (gameState?.jeopardy?.completedClues?.includes(clueId)) return;

    const updatedJeopardy = {
      ...(gameState?.jeopardy || {}),
      activeClue: {
        categoryId: cat.id,
        categoryName: cat.name,
        clueIndex: clueIndex,
        points: clue.points,
        question: clue.question,
        answer: clue.answer
      },
      buzzedPlayerId: null,
      buzzedPlayerName: null,
      buzzedTimestamp: null,
      buzzerLocked: false,
      completedClues: gameState?.jeopardy?.completedClues || [],
      failedPlayers: []
    };
    
    await updateGameState({
      activeGame: 'jeopardy',
      jeopardy: updatedJeopardy
    });
  };

  const handleResolveClueAdmin = async (isCorrect) => {
    if (!gameState?.jeopardy) return;
    const clue = gameState.jeopardy.activeClue;
    const playerId = gameState.jeopardy.buzzedPlayerId;
    const clueId = `${clue.categoryId}_${clue.points}`;

    if (isCorrect) {
      try {
        await adjustPointsAdmin(playerId, clue.points, `Jeopardy Correct: ${clue.categoryName}`);
      } catch (err) {
        console.error("Failed to adjust points:", err);
      }

      const completed = [...(gameState.jeopardy.completedClues || []), clueId];
      await updateGameState({
        jeopardy: {
          ...gameState.jeopardy,
          activeClue: null,
          buzzedPlayerId: null,
          buzzedPlayerName: null,
          buzzedTimestamp: null,
          buzzerLocked: false,
          completedClues: completed,
          failedPlayers: []
        }
      });
    } else {
      if (gameState.jeopardy.deductPoints) {
        try {
          await adjustPointsAdmin(playerId, -clue.points, `Jeopardy Incorrect: ${clue.categoryName}`);
        } catch (err) {
          console.error("Failed to deduct points:", err);
        }
      }
      
      const failed = [...(gameState.jeopardy.failedPlayers || []), playerId];
      await updateGameState({
        jeopardy: {
          ...gameState.jeopardy,
          buzzedPlayerId: null,
          buzzedPlayerName: null,
          buzzedTimestamp: null,
          buzzerLocked: false,
          failedPlayers: failed
        }
      });
    }
  };

  const handleSkipClueAdmin = async () => {
    if (!gameState?.jeopardy) return;
    const clue = gameState.jeopardy.activeClue;
    const clueId = `${clue.categoryId}_${clue.points}`;
    
    const completed = [...(gameState.jeopardy.completedClues || []), clueId];
    await updateGameState({
      jeopardy: {
        ...gameState.jeopardy,
        activeClue: null,
        buzzedPlayerId: null,
        buzzedPlayerName: null,
        buzzedTimestamp: null,
        buzzerLocked: false,
        completedClues: completed,
        failedPlayers: []
      }
    });
  };

  const handleToggleDeductAdmin = async (checked) => {
    await updateGameState({
      jeopardy: {
        ...(gameState?.jeopardy || {}),
        deductPoints: checked
      }
    });
  };

  const handleEndJeopardyAdmin = async () => {
    if (window.confirm("Are you sure you want to end Jeopardy and return to the leaderboard?")) {
      await updateGameState({
        activeGame: null,
        jeopardy: null
      });
    }
  };

  const handleNextFinaleStepAdmin = async () => {
    const currentStep = gameState?.finaleStep ?? 0;
    const nextStep = currentStep + 1;
    if (nextStep <= 5) {
      await updateGameState({ finaleStep: nextStep });
    }
  };

  const handlePrevFinaleStepAdmin = async () => {
    const currentStep = gameState?.finaleStep ?? 0;
    if (currentStep > 0) {
      await updateGameState({ finaleStep: currentStep - 1 });
    }
  };

  const handleResetFinaleStepsAdmin = async () => {
    await updateGameState({ finaleStep: 0 });
  };

  // --- Sub-page 2: Team Management Handlers ---
  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    
    const teamId = newTeamName.trim().replace(/\s+/g, '_').toLowerCase();
    
    // Parse hex to RGB to calculate shadows and secondary glow attributes
    let hex = newTeamColor.replace('#', '');
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;

    const teamData = {
      id: teamId,
      name: newTeamName.trim(),
      color: newTeamColor,
      secondary: newTeamColor,
      glow: `rgba(${r}, ${g}, ${b}, 0.25)`,
      accentBg: `rgba(${r}, ${g}, ${b}, 0.05)`
    };

    try {
      await saveTeam(teamId, teamData);
      setNewTeamName('');
      setNewTeamColor('#60a5fa');
      alert('Team added successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to create team: ' + err.message);
    }
  };

  // --- Sub-page 3: Player Management Handlers ---
  const handleCreatePlayer = async (e) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    try {
      await createPlaceholderPlayer(newPlayerName, newPlayerTeam);
      setNewPlayerName('');
      alert('Predefined player created successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to pre-create player: ' + err.message);
    }
  };

  const handleQuickAdjust = async (userId, amount) => {
    try {
      const desc = amount > 0 ? `Awarded by host` : `Deducted by host`;
      await adjustPointsAdmin(userId, amount, desc);
    } catch (err) {
      console.error(err);
      alert(STRINGS.admin.adjustErrorFailed + err.message);
    }
  };

  const handleCustomAdjust = async (userId) => {
    const amount = parseInt(customPoints[userId], 10);
    const desc = customDesc[userId] || 'Host adjustment';

    if (isNaN(amount)) {
      alert(STRINGS.admin.adjustErrorAmount);
      return;
    }

    try {
      await adjustPointsAdmin(userId, amount, desc);
      setCustomPoints(prev => ({ ...prev, [userId]: '' }));
      setCustomDesc(prev => ({ ...prev, [userId]: '' }));
    } catch (err) {
      console.error(err);
      alert(STRINGS.admin.adjustErrorFailed + err.message);
    }
  };

  const handleAssignQuestToPlayer = async (userId, goalId) => {
    const goal = goalsList.find(g => g.id === goalId);
    if (!goal) return;
    const assignedTo = goal.assignedTo || [];
    if (assignedTo.includes(userId)) return;
    try {
      await saveGoalTemplate(goalId, {
        ...goal,
        assignedTo: [...assignedTo, userId]
      });
    } catch (err) {
      console.error(err);
      alert('Failed to assign quest: ' + err.message);
    }
  };

  const handleUnassignQuestFromPlayer = async (userId, goalId) => {
    const goal = goalsList.find(g => g.id === goalId);
    if (!goal) return;
    const assignedTo = (goal.assignedTo || []).filter(uid => uid !== userId);
    try {
      await saveGoalTemplate(goalId, {
        ...goal,
        assignedTo
      });
    } catch (err) {
      console.error(err);
      alert('Failed to unassign quest: ' + err.message);
    }
  };

  // --- Sub-page 4: Side Quest Management Handlers ---
  const handleCreateQuestSubmit = async (e) => {
    e.preventDefault();
    if (!newQuestTitle.trim() || !newQuestPoints) return;
    const goalId = 'goal_' + Date.now();
    try {
      await saveGoalTemplate(goalId, {
        title: newQuestTitle.trim(),
        description: newQuestDesc.trim(),
        points: newQuestPoints,
        assignedTo: [],
        isRepeatable: newQuestRepeatable
      });
      setNewQuestTitle('');
      setNewQuestDesc('');
      setNewQuestPoints('');
      setNewQuestRepeatable(false);
      alert('Side quest created successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to create side quest: ' + err.message);
    }
  };

  const handleStartEditQuest = (g) => {
    setEditingQuestId(g.id);
    setEditQuestTitle(g.title);
    setEditQuestDesc(g.description || '');
    setEditQuestPoints(g.points);
    setEditQuestRepeatable(g.isRepeatable || false);
  };

  const handleSaveEditQuest = async (e, goalId) => {
    e.preventDefault();
    const goal = goalsList.find(g => g.id === goalId);
    if (!goal) return;
    try {
      await saveGoalTemplate(goalId, {
        title: editQuestTitle.trim(),
        description: editQuestDesc.trim(),
        points: editQuestPoints,
        assignedTo: goal.assignedTo || [],
        isRepeatable: editQuestRepeatable
      });
      setEditingQuestId(null);
      alert('Side quest updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to update quest: ' + err.message);
    }
  };

  const handleDeleteQuest = async (goalId) => {
    if (window.confirm('Are you sure you want to delete this side quest/goal?')) {
      try {
        await deleteGoalTemplate(goalId);
      } catch (err) {
        console.error(err);
        alert('Failed to delete side quest.');
      }
    }
  };

  // --- Sub-page 5: Jeopardy Creator Handlers ---
  const handleCreateJeopardyCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      alert("Please enter a category name.");
      return;
    }
    const cluesList = [
      { points: 100, question: clue100Q.trim(), answer: clue100A.trim() },
      { points: 200, question: clue200Q.trim(), answer: clue200A.trim() },
      { points: 300, question: clue300Q.trim(), answer: clue300A.trim() },
      { points: 400, question: clue400Q.trim(), answer: clue400A.trim() },
      { points: 500, question: clue500Q.trim(), answer: clue500A.trim() },
    ];
    const catId = 'cat_' + Date.now();
    try {
      await addJeopardyCategory(catId, newCatName, cluesList);
      setNewCatName('');
      setClue100Q(''); setClue100A('');
      setClue200Q(''); setClue200A('');
      setClue300Q(''); setClue300A('');
      setClue400Q(''); setClue400A('');
      setClue500Q(''); setClue500A('');
      alert("Jeopardy category created successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save category: " + err.message);
    }
  };

  // Render Passcode Gatekeep Page
  if (!isAdminAuthenticated) {
    return (
      <div className="admin-gate-page themed-background">
        <div className="admin-gate-card glass-panel animate-scale-up">
          <h2>{STRINGS.admin.gateTitle}</h2>
          <p className="subtitle">{STRINGS.admin.gateSubtitle}</p>
          <form onSubmit={handleAdminLogin} className="gate-form">
            <input
              type="password"
              placeholder={STRINGS.admin.gatePlaceholder}
              value={adminPasscode}
              onChange={(e) => setAdminPasscode(e.target.value)}
              autoFocus
            />
            {passcodeError && <div className="error-message">{passcodeError}</div>}
            <button type="submit" className="btn-primary">{STRINGS.admin.gateButton}</button>
          </form>
        </div>
      </div>
    );
  }

  // --- SUB-PAGE: Main Menu ---
  const renderMainMenu = () => {
    return (
      <div className="admin-menu-view animate-fade-in">
        <p className="menu-intro">Choose a management dashboard from the menu options below:</p>
        <div className="admin-menu-grid">
          <div className="menu-card glass-panel animate-scale-up" onClick={() => setAdminView('remote')}>
            <span className="menu-icon">📺</span>
            <h3>TV Screen Remote</h3>
            <p>Control what displays on the TV: welcome screens, live leaderboard, Jeopardy, or the finale winner podiums.</p>
          </div>

          <div className="menu-card glass-panel animate-scale-up" onClick={() => setAdminView('teams')}>
            <span className="menu-icon">👥</span>
            <h3>Team Management</h3>
            <p>Add new tables/teams, configure custom theme colors, and assign or remove players from each team.</p>
          </div>

          <div className="menu-card glass-panel animate-scale-up" onClick={() => setAdminView('players')}>
            <span className="menu-icon">👤</span>
            <h3>Player Management</h3>
            <p>Predefine guest names, assign side quests, adjust point balances (+/-), and audit transactional history logs.</p>
          </div>

          <div className="menu-card glass-panel animate-scale-up" onClick={() => setAdminView('quests')}>
            <span className="menu-icon">🕵️‍♂️</span>
            <h3>Side Quest & Goals</h3>
            <p>Create challenges, configure point values, set as single-use or repeatable, and manage player assignments.</p>
          </div>

          <div className="menu-card glass-panel animate-scale-up" onClick={() => setAdminView('jeopardy')}>
            <span className="menu-icon">🎮</span>
            <h3>Jeopardy Category Manager</h3>
            <p>Build and customize Jeopardy category boards, write clues and answers, and manage game categories.</p>
          </div>
        </div>
      </div>
    );
  };

  // --- SUB-PAGE: TV Remote ---
  const renderRemoteView = () => {
    return (
      <div className="admin-subpage-view remote-subpage animate-fade-in">
        <div className="subpage-header">
          <button onClick={() => setAdminView('menu')} className="btn-secondary back-btn">
            ← Back to Menu
          </button>
          <h2>TV SCREEN REMOTE CONTROL</h2>
          <span className="remote-status-badge">
            Current Screen: <strong style={{ color: 'var(--accent)' }}>{(gameState?.activeGame || 'leaderboard').toUpperCase()}</strong>
          </span>
        </div>

        <section className="glass-panel admin-remote-panel" style={{ marginTop: '10px' }}>
          <div className="remote-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Screen selection buttons */}
            <div className="remote-screen-selector">
              <span className="remote-label">Switch TV View:</span>
              <div className="remote-btn-group">
                <button 
                  onClick={() => handleSwitchScreen('welcome')} 
                  className={`remote-nav-btn ${gameState?.activeGame === 'welcome' ? 'active' : ''}`}
                >
                  Welcome Screen
                </button>
                <button 
                  onClick={() => handleSwitchScreen('jeopardy')} 
                  className={`remote-nav-btn ${gameState?.activeGame === 'jeopardy' ? 'active' : ''}`}
                >
                  Jeopardy Game
                </button>
                <button 
                  onClick={() => handleSwitchScreen(null)} 
                  className={`remote-nav-btn ${!gameState?.activeGame ? 'active' : ''}`}
                >
                  Leaderboard
                </button>
                <button 
                  onClick={() => handleSwitchScreen('finale')} 
                  className={`remote-nav-btn ${gameState?.activeGame === 'finale' ? 'active' : ''}`}
                >
                  Finale Screen
                </button>
              </div>
            </div>

            {/* Context Specific Panels */}
            {gameState?.activeGame === 'welcome' && (
              <div className="remote-sub-card glass-panel animate-fade-in" style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.01)' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--text-muted)' }}>WELCOME SCREEN CONTROLS</h4>
                <button 
                  onClick={handleReleaseBalloonsAdmin} 
                  disabled={gameState?.welcomeState === 'released'}
                  className="btn-primary" 
                  style={{ width: '100%', padding: '14px' }}
                >
                  {gameState?.welcomeState === 'released' ? '🎈 Balloons Released! (Redirecting...)' : '🎈 Release Balloons & Redirect'}
                </button>
              </div>
            )}

            {gameState?.activeGame === 'jeopardy' && (
              <div className="remote-sub-card glass-panel animate-fade-in" style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.01)' }}>
                <div style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h4 style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>JEOPARDY PLAY CONTROLS</h4>
                  <label className="deduct-toggle" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={gameState?.jeopardy?.deductPoints || false} 
                      onChange={(e) => handleToggleDeductAdmin(e.target.checked)} 
                    />
                    <span>Deduct on wrong answer</span>
                  </label>
                </div>

                {gameState?.jeopardy?.activeClue ? (
                  <div className="remote-active-clue-box glass-panel" style={{ padding: '15px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--accent)', marginBottom: '8px', fontWeight: 'bold' }}>
                      <span>{gameState.jeopardy.activeClue.categoryName}</span>
                      <span>{gameState.jeopardy.activeClue.points} Points</span>
                    </div>
                    <p style={{ margin: '0 0 10px 0', fontSize: '15px', fontStyle: 'italic' }}>“{gameState.jeopardy.activeClue.question}”</p>
                    <p style={{ margin: '0 0 15px 0', fontSize: '13px', color: '#10b981', fontWeight: '600' }}>Answer: {gameState.jeopardy.activeClue.answer}</p>

                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '6px', textAlign: 'center', marginBottom: '15px' }}>
                      {gameState.jeopardy.buzzedPlayerId ? (
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Buzzed In!</div>
                          <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent)', marginTop: '4px' }}>🙋‍♂️ {gameState.jeopardy.buzzedPlayerName}</div>
                        </div>
                      ) : (
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          <span className="glowing-dot" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', marginRight: '6px', boxShadow: '0 0 8px #10b981' }}></span>
                          Buzzers open. Waiting for players...
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        disabled={!gameState.jeopardy.buzzedPlayerId} 
                        onClick={() => handleResolveClueAdmin(true)} 
                        className="btn-primary success-btn" 
                        style={{ flex: 1, padding: '12px', fontSize: '13px' }}
                      >
                        Correct (+{gameState.jeopardy.activeClue.points})
                      </button>
                      <button 
                        disabled={!gameState.jeopardy.buzzedPlayerId} 
                        onClick={() => handleResolveClueAdmin(false)} 
                        className="btn-secondary error-btn" 
                        style={{ flex: 1, padding: '12px', fontSize: '13px' }}
                      >
                        Incorrect
                      </button>
                      <button 
                        onClick={handleSkipClueAdmin} 
                        className="btn-secondary" 
                        style={{ padding: '12px 16px', fontSize: '13px' }}
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: 'var(--text-muted)' }}>Tap a clue to show it on the TV:</p>
                    {jeopardyCategories.length === 0 ? (
                      <p style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--text-muted)' }}>No categories configured yet. Go to the Jeopardy Manager page to add some.</p>
                    ) : (
                      <div style={{ overflowX: 'auto', paddingBottom: '10px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${jeopardyCategories.length}, 120px)`, gap: '10px' }}>
                          {jeopardyCategories.map((cat) => (
                            <div key={cat.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ fontSize: '11px', fontWeight: 'bold', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '4px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={cat.name}>
                                {cat.name}
                              </div>
                              {[100, 200, 300, 400, 500].map((pts, idx) => {
                                const clueId = `${cat.id}_${pts}`;
                                const isCompleted = gameState?.jeopardy?.completedClues?.includes(clueId);
                                const clue = cat.clues[idx] || { points: pts, question: '', answer: '' };
                                return (
                                  <button
                                    key={pts}
                                    disabled={isCompleted || !clue.question}
                                    onClick={() => handleSelectClueAdmin(cat, idx, clue)}
                                    style={{
                                      padding: '10px 0',
                                      fontSize: '12px',
                                      borderRadius: '6px',
                                      border: '1px solid rgba(255,255,255,0.05)',
                                      background: isCompleted ? 'rgba(255,255,255,0.02)' : clue.question ? 'var(--accent-bg)' : 'rgba(255,255,255,0.01)',
                                      color: isCompleted ? 'rgba(255,255,255,0.1)' : clue.question ? 'var(--accent)' : 'rgba(255,255,255,0.15)',
                                      cursor: isCompleted || !clue.question ? 'not-allowed' : 'pointer',
                                      fontWeight: 'bold',
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    {!clue.question ? '—' : isCompleted ? '✓' : pts}
                                  </button>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={handleEndJeopardyAdmin} className="btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>
                    End Jeopardy Game
                  </button>
                </div>
              </div>
            )}

            {gameState?.activeGame === 'finale' && (
              <div className="remote-sub-card glass-panel animate-fade-in" style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.01)' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--text-muted)' }}>FINALE SEQUENCE REVEALS</h4>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  <span>Current Reveal Step:</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>
                    {gameState.finaleStep === 0 ? 'Empty Podium' :
                     gameState.finaleStep === 1 ? '3rd Place Revealed' :
                     gameState.finaleStep === 2 ? '2nd & 3rd Revealed' :
                     gameState.finaleStep === 3 ? 'Winner (1st) Revealed! 👑' :
                     gameState.finaleStep === 4 ? 'Statistics Revealed' :
                     'Goodbye Controls Revealed'}
                  </span>
                </div>
                
                <div style={{ display: 'flex', gap: '4px', marginBottom: '15px' }}>
                  {[0, 1, 2, 3, 4, 5].map((step) => (
                    <div 
                      key={step} 
                      style={{ 
                        height: '6px', 
                        flex: 1, 
                        borderRadius: '3px', 
                        background: (gameState?.finaleStep ?? 0) >= step ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                        boxShadow: (gameState?.finaleStep ?? 0) >= step ? '0 0 6px var(--accent-glow)' : 'none',
                        transition: 'all 0.3s'
                      }}
                    ></div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                  <button 
                    disabled={(gameState?.finaleStep ?? 0) === 0} 
                    onClick={handlePrevFinaleStepAdmin} 
                    className="btn-secondary" 
                    style={{ flex: 1, padding: '10px', fontSize: '12px' }}
                  >
                    ◀ Back Step
                  </button>
                  <button 
                    disabled={(gameState?.finaleStep ?? 0) >= 5} 
                    onClick={handleNextFinaleStepAdmin} 
                    className="btn-primary" 
                    style={{ flex: 1.5, padding: '10px', fontSize: '12px' }}
                  >
                    {(gameState?.finaleStep ?? 0) === 0 ? 'Reveal 3rd Place ▶' :
                     (gameState?.finaleStep ?? 0) === 1 ? 'Reveal 2nd Place ▶' :
                     (gameState?.finaleStep ?? 0) === 2 ? 'Reveal Winner! 👑 ▶' :
                     (gameState?.finaleStep ?? 0) === 3 ? 'Reveal Stats ▶' :
                     (gameState?.finaleStep ?? 0) === 4 ? 'Show Wrap Up Controls ▶' :
                     'All Steps Completed'}
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
                  <button onClick={handleResetFinaleStepsAdmin} className="btn-secondary" style={{ fontSize: '11px', padding: '6px 10px' }}>
                    Reset Reveal Step
                  </button>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleSwitchScreen('goodbye')} className="btn-primary" style={{ fontSize: '11px', padding: '6px 12px' }}>
                      Go to Goodbye View
                    </button>
                    <button onClick={() => handleSwitchScreen(null)} className="btn-secondary" style={{ fontSize: '11px', padding: '6px 12px' }}>
                      Back to Leaderboard
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!gameState?.activeGame && (
              <div className="remote-sub-card glass-panel animate-fade-in" style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.01)', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  The TV page is currently showing the live leaderboard. Use the screen switcher buttons above to display welcome, Jeopardy, or finale slides.
                </p>
              </div>
            )}

            {gameState?.activeGame === 'goodbye' && (
              <div className="remote-sub-card glass-panel animate-fade-in" style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.01)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>TV is showing the Goodbye wrap-up screen.</span>
                <button onClick={() => handleSwitchScreen(null)} className="btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>
                  Return to Leaderboard
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    );
  };

  // --- SUB-PAGE: Team Management ---
  const renderTeamsView = () => {
    return (
      <div className="admin-subpage-view teams-subpage animate-fade-in">
        <div className="subpage-header">
          <button onClick={() => setAdminView('menu')} className="btn-secondary back-btn">
            ← Back to Menu
          </button>
          <h2>TEAM/TABLE MANAGEMENT</h2>
        </div>

        <div className="admin-main-container" style={{ marginTop: '10px' }}>
          {/* Add Team Panel */}
          <div className="admin-col">
            <section className="glass-panel admin-section">
              <h3>Create Dynamic Team/Table</h3>
              <form onSubmit={handleCreateTeam} className="goal-builder-form">
                <div className="input-group">
                  <label htmlFor="team-name-input">Team / Table Name</label>
                  <input
                    id="team-name-input"
                    type="text"
                    placeholder="e.g. Emerald Table, Gold Team"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '15px' }}>
                  <label htmlFor="team-color-picker" style={{ margin: 0 }}>Accent Theme Color:</label>
                  <input
                    id="team-color-picker"
                    type="color"
                    value={newTeamColor}
                    onChange={(e) => setNewTeamColor(e.target.value)}
                    style={{ width: '40px', height: '40px', padding: 0, border: 'none', borderRadius: '50%', cursor: 'pointer', background: 'none' }}
                  />
                  <span style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 'bold' }}>{newTeamColor}</span>
                </div>
                <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>Create Team</button>
              </form>
            </section>
          </div>

          {/* Teams List Panel */}
          <div className="admin-col">
            <section className="glass-panel admin-section" style={{ minWidth: '100%' }}>
              <h3>Configured Teams/Tables ({teams.length})</h3>
              
              <div className="teams-management-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%' }}>
                {teams.length === 0 ? (
                  <p className="empty-msg">No teams configured yet.</p>
                ) : (
                  teams.map((t) => {
                    const teamPlayers = players.filter((p) => p.team === t.id);
                    return (
                      <div 
                        key={t.id} 
                        className="team-manage-card" 
                        style={{ 
                          borderLeft: `4px solid ${t.color}`, 
                          background: 'rgba(255,255,255,0.01)', 
                          borderTop: '1px solid rgba(255,255,255,0.03)',
                          borderRight: '1px solid rgba(255,255,255,0.03)',
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                          padding: '16px', 
                          borderRadius: '12px' 
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: t.color, display: 'inline-block' }}></span>
                            <span style={{ fontWeight: 'bold', fontSize: '15px', color: 'var(--text-bright)' }}>{t.name}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({t.id})</span>
                          </div>
                          
                          <button
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to delete the team "${t.name}"? Players on this team will be unassigned.`)) {
                                const promises = teamPlayers.map(p => updatePlayerTeam(p.uid, ''));
                                await Promise.all(promises);
                                await deleteTeam(t.id);
                                alert('Team deleted.');
                              }
                            }}
                            className="delete-goal-btn"
                            style={{ fontSize: '12px' }}
                          >
                            ✕ Delete
                          </button>
                        </div>

                        {/* Players assigned to this team */}
                        <div style={{ marginTop: '12px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Players ({teamPlayers.length}):</span>
                          {teamPlayers.length === 0 ? (
                            <p style={{ margin: '4px 0 0 0', fontSize: '12px', fontStyle: 'italic', color: 'var(--text-muted)' }}>No players assigned to this table.</p>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                              {teamPlayers.map((p) => (
                                <span 
                                  key={p.uid} 
                                  className="team-player-pill" 
                                  style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '6px', 
                                    fontSize: '11px', 
                                    background: 'rgba(255,255,255,0.04)', 
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    padding: '4px 10px', 
                                    borderRadius: '15px', 
                                    color: 'var(--text-bright)' 
                                  }}
                                >
                                  {p.name}
                                  {p.isPlaceholder && <span style={{ fontSize: '8px', color: 'var(--accent)' }}>(Pre)</span>}
                                  <button
                                    onClick={() => updatePlayerTeam(p.uid, '')}
                                    style={{ background: 'none', border: 'none', color: '#ff6f61', cursor: 'pointer', fontSize: '12px', padding: 0, marginLeft: '2px' }}
                                    title="Remove from team"
                                  >
                                    ✕
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Add player dropdown */}
                        <div style={{ marginTop: '12px' }}>
                          <select
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) {
                                updatePlayerTeam(val, t.id);
                                e.target.value = '';
                              }
                            }}
                            style={{ 
                              width: '100%', 
                              fontSize: '12px', 
                              padding: '8px', 
                              borderRadius: '8px', 
                              background: 'rgba(0,0,0,0.2)', 
                              border: '1px solid var(--border-glass)', 
                              color: 'var(--text-bright)' 
                            }}
                          >
                            <option value="">+ Add player to this team...</option>
                            {players.filter(p => p.team !== t.id).map(p => (
                              <option key={p.uid} value={p.uid}>
                                {p.name} {p.team ? `(Currently on ${teamsMap[p.team]?.name || p.team})` : '(No team)'}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  };

  // --- SUB-PAGE: Player Management ---
  const renderPlayersView = () => {
    return (
      <div className="admin-subpage-view players-subpage animate-fade-in">
        <div className="subpage-header">
          <button onClick={() => setAdminView('menu')} className="btn-secondary back-btn">
            ← Back to Menu
          </button>
          <h2>PLAYER & GUEST MANAGEMENT</h2>
        </div>

        <div className="admin-main-container" style={{ marginTop: '10px' }}>
          {/* Add Player Panel */}
          <div className="admin-col">
            <section className="glass-panel admin-section">
              <h3>Predefine Guest Account</h3>
              <form onSubmit={handleCreatePlayer} className="goal-builder-form">
                <div className="input-group">
                  <label htmlFor="player-name-input">Guest Name</label>
                  <input
                    id="player-name-input"
                    type="text"
                    placeholder="e.g. John Doe, Alex Rivera"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="player-team-select">Table / Team Assignment</label>
                  <select
                    id="player-team-select"
                    value={newPlayerTeam}
                    onChange={(e) => setNewPlayerTeam(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', color: 'var(--text-bright)' }}
                  >
                    <option value="">-- Choose Table --</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>Create Predefined Guest</button>
              </form>
            </section>
          </div>

          {/* Players List Panel */}
          <div className="admin-col">
            <section className="glass-panel admin-section players-section" style={{ minWidth: '100%' }}>
              <h3>Registered & Predefined Guests ({players.length})</h3>
              
              <div className="players-admin-list" style={{ width: '100%' }}>
                {players.length === 0 ? (
                  <p className="empty-msg">No players registered or pre-created yet.</p>
                ) : (
                  players.map((p) => {
                    const pTeam = (teamsMap && teamsMap[p.team]) || fallbackTeam;
                    
                    // Filter player's assigned quests
                    const playerQuests = goalsList.filter(g => g.assignedTo && g.assignedTo.includes(p.uid));

                    return (
                      <div key={p.uid} className="player-admin-card" style={{ borderLeftColor: pTeam.color }}>
                        <div className="player-card-header">
                          <div className="header-meta">
                            <span className="player-name-bold" style={{ fontSize: '16px' }}>{p.name}</span>
                            {p.isPlaceholder ? (
                              <span style={{ fontSize: '10px', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '2px 6px', borderRadius: '10px', color: 'var(--accent)', fontWeight: 'bold' }}>Predefined</span>
                            ) : (
                              <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 6px', borderRadius: '10px', color: '#10b981', fontWeight: 'bold' }}>Active</span>
                            )}
                          </div>
                          <span className="player-points-tag" style={{ fontSize: '18px', color: 'var(--accent)' }}>{p.points ?? 0} pts</span>
                        </div>

                        {/* Edit Team Selector */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                          <span style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>Table / Team:</span>
                          <select
                            value={p.team || ''}
                            onChange={(e) => updatePlayerTeam(p.uid, e.target.value)}
                            style={{ 
                              padding: '4px 8px', 
                              borderRadius: '6px', 
                              background: 'rgba(0,0,0,0.15)', 
                              border: '1px solid var(--border-glass)', 
                              color: 'var(--text-bright)',
                              fontSize: '12px'
                            }}
                          >
                            <option value="">No Team</option>
                            {teams.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Point Adjustment Tools */}
                        <div className="adjustment-tools" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Adjust Points:</span>
                          <div className="quick-adjust-row">
                            <button onClick={() => handleQuickAdjust(p.uid, 10)} className="btn-quick">+10</button>
                            <button onClick={() => handleQuickAdjust(p.uid, 50)} className="btn-quick">+50</button>
                            <button onClick={() => handleQuickAdjust(p.uid, -10)} className="btn-quick">-10</button>
                            <button onClick={() => handleQuickAdjust(p.uid, -50)} className="btn-quick">-50</button>
                          </div>
                          <div className="custom-adjust-row">
                            <input
                              type="number"
                              placeholder={STRINGS.admin.adjustCustomPointsPlaceholder}
                              value={customPoints[p.uid] || ''}
                              onChange={(e) => setCustomPoints(prev => ({ ...prev, [p.uid]: e.target.value }))}
                            />
                            <input
                              type="text"
                              placeholder={STRINGS.admin.adjustCustomDescPlaceholder}
                              value={customDesc[p.uid] || ''}
                              onChange={(e) => setCustomDesc(prev => ({ ...prev, [p.uid]: e.target.value }))}
                            />
                            <button onClick={() => handleCustomAdjust(p.uid)} className="btn-secondary adjust-apply-btn">{STRINGS.admin.adjustCustomApplyBtn}</button>
                          </div>
                        </div>

                        {/* Player Side Quests Checklist */}
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Assigned Quests:</span>
                          {playerQuests.length === 0 ? (
                            <p style={{ margin: '4px 0 0 0', fontSize: '12px', fontStyle: 'italic', color: 'var(--text-muted)' }}>No quests assigned yet.</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                              {playerQuests.map((g) => {
                                // Check if completed
                                const completions = allCompletedGoals.filter(cg => cg.userId === p.uid && cg.goalId === g.id);
                                const isCompleted = completions.length > 0;
                                return (
                                  <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '6px', fontSize: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ color: isCompleted ? '#10b981' : 'var(--text-muted)', fontWeight: isCompleted ? 'bold' : 'normal' }}>
                                        {isCompleted ? '✓' : '○'} {g.title}
                                      </span>
                                      {g.isRepeatable && completions.length > 0 && (
                                        <span style={{ fontSize: '10px', background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '1px 5px', borderRadius: '10px' }}>
                                          x{completions.length}
                                        </span>
                                      )}
                                    </div>
                                    <button 
                                      onClick={() => handleUnassignQuestFromPlayer(p.uid, g.id)}
                                      style={{ background: 'none', border: 'none', color: '#ff6f61', cursor: 'pointer', fontSize: '11px', padding: 0 }}
                                      title="Unassign Quest"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Dropdown to assign new side quests */}
                          <div style={{ marginTop: '8px' }}>
                            <select
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val) {
                                  handleAssignQuestToPlayer(p.uid, val);
                                  e.target.value = '';
                                }
                              }}
                              style={{ width: '100%', fontSize: '12px', padding: '6px', borderRadius: '6px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', color: 'var(--text-bright)' }}
                            >
                              <option value="">+ Assign Quest / Goal...</option>
                              {goalsList.filter(g => !playerQuests.some(pq => pq.id === g.id)).map(g => (
                                <option key={g.id} value={g.id}>{g.title} (+{g.points} pts)</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Transaction history log */}
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (activeHistoryUserId === p.uid) {
                                setActiveHistoryUserId(null);
                              } else {
                                setActiveHistoryUserId(p.uid);
                              }
                            }}
                            className="btn-secondary"
                            style={{ width: '100%', fontSize: '11px', padding: '6px' }}
                          >
                            {activeHistoryUserId === p.uid ? '▲ Hide Points Log' : '▼ View Point History Logs'}
                          </button>
                          
                          {activeHistoryUserId === p.uid && (
                            <div className="player-history-logs" style={{ marginTop: '8px', maxHeight: '140px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', fontSize: '11px' }}>
                              {playerHistoryLogs.length === 0 ? (
                                <p style={{ margin: 0, color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>No history records found.</p>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {playerHistoryLogs.map((log) => (
                                    <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '4px' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                                        <span style={{ fontWeight: '500', color: 'var(--text-bright)' }}>{log.description}</span>
                                        <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{log.timestamp?.toDate ? log.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                                      </div>
                                      <strong style={{ color: log.amount > 0 ? '#10b981' : '#ef4444', alignSelf: 'center', fontSize: '13px' }}>
                                        {log.amount > 0 ? '+' : ''}{log.amount}
                                      </strong>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Delete player button */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px' }}>
                          <button
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to delete player "${p.name}"? This is permanent.`)) {
                                await deletePlayerAdmin(p.uid);
                                alert('Player deleted.');
                              }
                            }}
                            className="delete-goal-btn"
                            style={{ fontSize: '11px', color: '#ff6f61' }}
                          >
                            Delete Player Account Permanently
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  };

  // --- SUB-PAGE: Side Quest Management ---
  const renderQuestsView = () => {
    return (
      <div className="admin-subpage-view quests-subpage animate-fade-in">
        <div className="subpage-header">
          <button onClick={() => setAdminView('menu')} className="btn-secondary back-btn">
            ← Back to Menu
          </button>
          <h2>SIDE QUEST & CHALLENGE BUILDER</h2>
        </div>

        <div className="admin-main-container" style={{ marginTop: '10px' }}>
          {/* Add Side Quest Form */}
          <div className="admin-col">
            <section className="glass-panel admin-section">
              <h3>Create Side Quest / Goal</h3>
              <form onSubmit={handleCreateQuestSubmit} className="goal-builder-form">
                <div className="input-group">
                  <label htmlFor="quest-title-input">Quest Title</label>
                  <input
                    id="quest-title-input"
                    type="text"
                    placeholder="e.g. Pinky Promise, Secret Agent"
                    value={newQuestTitle}
                    onChange={(e) => setNewQuestTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="quest-desc-input">Description / Challenge Instructions</label>
                  <input
                    id="quest-desc-input"
                    type="text"
                    placeholder="e.g. Get someone to explain their favorite conspiracy theory..."
                    value={newQuestDesc}
                    onChange={(e) => setNewQuestDesc(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="quest-pts-input">Points Reward</label>
                  <input
                    id="quest-pts-input"
                    type="number"
                    placeholder="e.g. 150"
                    value={newQuestPoints}
                    onChange={(e) => setNewQuestPoints(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '5px 0' }}>
                  <input
                    type="checkbox"
                    id="repeatable-checkbox"
                    checked={newQuestRepeatable}
                    onChange={(e) => setNewQuestRepeatable(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="repeatable-checkbox" style={{ margin: 0, textTransform: 'none', fontSize: '13px', cursor: 'pointer' }}>
                    Repeatable (Guests can claim multiple times to keep earning points)
                  </label>
                </div>
                <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>Add Challenge</button>
              </form>
            </section>
          </div>

          {/* Quests Templates List */}
          <div className="admin-col">
            <section className="glass-panel admin-section" style={{ minWidth: '100%' }}>
              <h3>Configured Quests/Goals ({goalsList.length})</h3>
              
              <div className="goals-templates-list" style={{ gap: '15px', width: '100%' }}>
                {goalsList.length === 0 ? (
                  <p className="empty-msg">No side quests/goals configured yet.</p>
                ) : (
                  goalsList.map((g) => (
                    <div 
                      key={g.id} 
                      className="template-item" 
                      style={{ 
                        flexDirection: 'column', 
                        alignItems: 'stretch', 
                        gap: '12px', 
                        padding: '16px', 
                        background: 'rgba(255,255,255,0.01)', 
                        border: '1px solid rgba(255,255,255,0.04)', 
                        borderRadius: '12px' 
                      }}
                    >
                      {editingQuestId === g.id ? (
                        /* Inline Editor for Quest */
                        <form onSubmit={(e) => handleSaveEditQuest(e, g.id)} className="goal-builder-form" style={{ width: '100%', gap: '8px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--accent)' }}>EDITING QUEST</div>
                          <input
                            type="text"
                            value={editQuestTitle}
                            onChange={(e) => setEditQuestTitle(e.target.value)}
                            required
                            placeholder="Quest Title"
                          />
                          <input
                            type="text"
                            value={editQuestDesc}
                            onChange={(e) => setEditQuestDesc(e.target.value)}
                            required
                            placeholder="Description"
                          />
                          <input
                            type="number"
                            value={editQuestPoints}
                            onChange={(e) => setEditQuestPoints(e.target.value)}
                            required
                            placeholder="Points"
                          />
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0' }}>
                            <input
                              type="checkbox"
                              id={`edit-repeatable-${g.id}`}
                              checked={editQuestRepeatable}
                              onChange={(e) => setEditQuestRepeatable(e.target.checked)}
                              style={{ width: '15px', height: '15px' }}
                            />
                            <label htmlFor={`edit-repeatable-${g.id}`} style={{ margin: 0, textTransform: 'none', fontSize: '12px' }}>Repeatable</label>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <button type="submit" className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>Save Changes</button>
                            <button type="button" onClick={() => setEditingQuestId(null)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>Cancel</button>
                          </div>
                        </form>
                      ) : (
                        /* Static Quest Detail Card */
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <strong style={{ fontSize: '15px', color: 'var(--text-bright)' }}>{g.title}</strong>
                              <span style={{ marginLeft: '10px', fontSize: '12px', color: 'var(--accent)', fontWeight: 'bold' }}>+{g.points} pts</span>
                              {g.isRepeatable && (
                                <span style={{ marginLeft: '8px', fontSize: '9px', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', padding: '1px 5px', borderRadius: '10px', color: 'var(--accent)', fontWeight: 'bold' }}>Repeatable</span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button 
                                onClick={() => handleStartEditQuest(g)} 
                                className="delete-goal-btn" 
                                style={{ fontSize: '12px', color: 'var(--text-muted)' }}
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteQuest(g.id)} 
                                className="delete-goal-btn" 
                                style={{ fontSize: '12px' }}
                              >
                                ✕ Delete
                              </button>
                            </div>
                          </div>
                          <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4' }}>{g.description}</p>
                          
                          {/* Manage assigned players for this quest */}
                          <div style={{ marginTop: '12px', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assigned Players:</span>
                            {(!g.assignedTo || g.assignedTo.length === 0) ? (
                              <p style={{ margin: '4px 0 0 0', fontSize: '12px', fontStyle: 'italic', color: 'var(--text-muted)' }}>No players assigned yet.</p>
                            ) : (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                                {g.assignedTo.map(uid => {
                                  const playerObj = players.find(p => p.uid === uid);
                                  if (!playerObj) return null;
                                  return (
                                    <span key={uid} className="team-player-pill" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', background: 'rgba(255,255,255,0.04)', padding: '3px 8px', borderRadius: '12px', color: 'var(--text-bright)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                      {playerObj.name}
                                      <button 
                                        onClick={() => handleUnassignQuestFromPlayer(uid, g.id)}
                                        style={{ background: 'none', border: 'none', color: '#ff6f61', cursor: 'pointer', fontSize: '11px', padding: 0 }}
                                      >
                                        ✕
                                      </button>
                                    </span>
                                  );
                                })}
                              </div>
                            )}

                            {/* Dropdown to assign players */}
                            <div style={{ marginTop: '8px' }}>
                              <select
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val) {
                                    handleAssignQuestToPlayer(val, g.id);
                                    e.target.value = '';
                                  }
                                }}
                                style={{ width: '100%', fontSize: '11px', padding: '6px', borderRadius: '6px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', color: 'var(--text-bright)' }}
                              >
                                <option value="">+ Assign player to this quest...</option>
                                {players.filter(p => !g.assignedTo?.includes(p.uid)).map(p => (
                                  <option key={p.uid} value={p.uid}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  };

  // --- SUB-PAGE: Jeopardy Category Manager ---
  const renderJeopardyView = () => {
    return (
      <div className="admin-subpage-view jeopardy-subpage animate-fade-in">
        <div className="subpage-header">
          <button onClick={() => setAdminView('menu')} className="btn-secondary back-btn">
            ← Back to Menu
          </button>
          <h2>JEOPARDY CATEGORY MANAGER</h2>
        </div>

        <div className="admin-main-container" style={{ marginTop: '10px' }}>
          {/* Categories List */}
          <div className="admin-col">
            <section className="glass-panel admin-section">
              <h3>Configured Categories ({jeopardyCategories.length})</h3>
              {jeopardyCategories.length === 0 ? (
                <p className="empty-msg">{STRINGS.admin.jeopardyEmpty}</p>
              ) : (
                <div className="goals-templates-list" style={{ gap: '12px' }}>
                  {jeopardyCategories.map((cat) => (
                    <div key={cat.id} className="template-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px', padding: '15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="template-title" style={{ fontSize: '15px', fontWeight: 'bold' }}>{cat.name}</span>
                        <button 
                          onClick={async () => {
                            if (window.confirm(STRINGS.admin.jeopardyDeleteConfirm.replace('{name}', cat.name))) {
                              await deleteJeopardyCategory(cat.id);
                            }
                          }} 
                          className="delete-goal-btn"
                          style={{ fontSize: '16px' }}
                        >
                          ✕
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', fontSize: '10px', color: 'var(--text-muted)' }}>
                        {cat.clues.map((clue, idx) => (
                          <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 4px', borderRadius: '6px', textAlign: 'center' }}>
                            <div style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{clue.points}</div>
                            <div style={{ fontSize: '9px', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={clue.question}>
                              {clue.question ? '✅' : '❌'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Add Category Form */}
          <div className="admin-col">
            <section className="glass-panel admin-section">
              <h3>{STRINGS.admin.jeopardyCreateTitle}</h3>
              <form onSubmit={handleCreateJeopardyCategory} className="goal-builder-form" style={{ gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', letterSpacing: '0.05em', marginBottom: '8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{STRINGS.admin.jeopardyCatNameLabel}</label>
                  <input
                    type="text"
                    placeholder={STRINGS.admin.jeopardyCatNamePlaceholder}
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {[100, 200, 300, 400, 500].map((points) => {
                    const qVal = points === 100 ? clue100Q : points === 200 ? clue200Q : points === 300 ? clue300Q : points === 400 ? clue400Q : clue500Q;
                    const aVal = points === 100 ? clue100A : points === 200 ? clue200A : points === 300 ? clue300A : points === 400 ? clue400A : clue500A;
                    const setQ = points === 100 ? setClue100Q : points === 200 ? setClue200Q : points === 300 ? setClue300Q : points === 400 ? setClue400Q : setClue500Q;
                    const setA = points === 100 ? setClue100A : points === 200 ? setClue200A : points === 300 ? setClue300A : points === 400 ? setClue400A : setClue500A;

                    return (
                      <div key={points} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr', gap: '10px', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--accent)', fontSize: '13px' }}>{points} pts</span>
                        <input
                          type="text"
                          placeholder={STRINGS.admin.jeopardyQuestionPlaceholder}
                          value={qVal}
                          onChange={(e) => setQ(e.target.value)}
                          required
                        />
                        <input
                          type="text"
                          placeholder={STRINGS.admin.jeopardyAnswerPlaceholder}
                          value={aVal}
                          onChange={(e) => setA(e.target.value)}
                          required
                        />
                      </div>
                    );
                  })}
                </div>

                <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>
                  {STRINGS.admin.jeopardySaveBtn}
                </button>
              </form>
            </section>
          </div>
        </div>
      </div>
    );
  };

  // Main Return Block
  return (
    <div className="admin-page">
      <header className="admin-header glass-panel">
        <h1 style={{ cursor: 'pointer' }} onClick={() => setAdminView('menu')}>{STRINGS.admin.headerTitle}</h1>
        <button onClick={() => setIsAdminAuthenticated(false)} className="btn-secondary logout-btn">{STRINGS.admin.headerLock}</button>
      </header>

      {adminView === 'menu' && renderMainMenu()}
      {adminView === 'remote' && renderRemoteView()}
      {adminView === 'teams' && renderTeamsView()}
      {adminView === 'players' && renderPlayersView()}
      {adminView === 'quests' && renderQuestsView()}
      {adminView === 'jeopardy' && renderJeopardyView()}
    </div>
  );
}
