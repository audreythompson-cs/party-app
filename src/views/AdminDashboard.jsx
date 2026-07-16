import { useState, useEffect } from 'react';
import { 
  onLeaderboardChange, 
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
  onAllCompletedGoals,
  bootstrapAdmin
} from '../firebase/db';
import { useAuth } from '../context/AuthContext';
import { STRINGS } from '../constants/strings';
import { auth } from '../firebase/config';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import '../styles/views/AdminDashboard.css';

export default function AdminDashboard() {
  const { teams, teamsMap } = useAuth();
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return sessionStorage.getItem('admin_authenticated') === 'true';
  });
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
  const [expandedPlayerId, setExpandedPlayerId] = useState(null);
  const [showAddQuestForPlayerId, setShowAddQuestForPlayerId] = useState(null);
  const [activeTeamSelectorPlayerId, setActiveTeamSelectorPlayerId] = useState(null);
  const [editingPointsPlayerId, setEditingPointsPlayerId] = useState(null);
  const [tempPointsVal, setTempPointsVal] = useState('');

  // Form State: Quests/Goals Page
  const [newQuestTitle, setNewQuestTitle] = useState('');
  const [newQuestDesc, setNewQuestDesc] = useState('');
  const [newQuestPoints, setNewQuestPoints] = useState('');
  const [newQuestRepeatable, setNewQuestRepeatable] = useState(false);
  const [selectedTeamForQuestAssign, setSelectedTeamForQuestAssign] = useState({});
  const [showAssignDrawerForQuestId, setShowAssignDrawerForQuestId] = useState(null);

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
        if (sessionStorage.getItem('admin_authenticated') === 'true') {
          bootstrapAdmin(user.uid).catch((err) => {
            console.error('Failed to bootstrap admin profile on refresh:', err);
          });
        }
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
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (adminPasscode.trim().toUpperCase() === 'ADMIN2026') {
      setIsAdminAuthenticated(true);
      sessionStorage.setItem('admin_authenticated', 'true');
      setPasscodeError('');
      if (auth.currentUser) {
        try {
          await bootstrapAdmin(auth.currentUser.uid);
          console.log("Admin profile bootstrapped successfully.");
        } catch (err) {
          console.error("Failed to bootstrap admin profile:", err);
        }
      }
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

  const handleUpdateTeamColor = async (teamId, newColor) => {
    let hex = newColor.replace('#', '');
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;

    const teamData = {
      color: newColor,
      secondary: newColor,
      glow: `rgba(${r}, ${g}, ${b}, 0.25)`,
      accentBg: `rgba(${r}, ${g}, ${b}, 0.05)`
    };

    try {
      await saveTeam(teamId, teamData);
    } catch (err) {
      console.error(err);
      alert('Failed to update team color: ' + err.message);
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

  const handleCustomAdjust = async (userId, isPositive) => {
    let amount = parseInt(customPoints[userId], 10);
    const desc = customDesc[userId] || 'Host adjustment';

    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid positive number for amount.");
      return;
    }

    if (!isPositive) {
      amount = -amount;
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

  const handleSavePointsDirect = async (userId) => {
    const val = parseInt(tempPointsVal, 10);
    setEditingPointsPlayerId(null);
    if (isNaN(val)) return;

    const playerObj = players.find(p => p.uid === userId);
    if (!playerObj) return;

    const currentPoints = playerObj.points ?? 0;
    const diff = val - currentPoints;
    if (diff === 0) return;

    try {
      await adjustPointsAdmin(userId, diff, 'Direct score update');
    } catch (err) {
      console.error(err);
      alert('Failed to update points: ' + err.message);
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
        <div className="admin-menu-grid mobile-menu-grid">
          <button className="menu-btn animate-scale-up" onClick={() => setAdminView('remote')}>
            remote
          </button>
          <button className="menu-btn animate-scale-up" onClick={() => setAdminView('teams')}>
            teams
          </button>
          <button className="menu-btn animate-scale-up" onClick={() => setAdminView('players')}>
            players
          </button>
          <button className="menu-btn animate-scale-up" onClick={() => setAdminView('quests')}>
            side quests
          </button>
        </div>
      </div>
    );
  };

  // --- SUB-PAGE: TV Remote ---
  const renderRemoteView = () => {
    return (
      <div className="admin-subpage-view remote-subpage animate-fade-in">
        <div className="subpage-header">
          <button onClick={() => setAdminView('menu')} className="back-arrow-btn">
            ←
          </button>
          <h2>REMOTE</h2>
        </div>

        <div className="flat-layout" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Screen selection buttons stacked vertically */}
          <div className="remote-btn-group">
            <button 
              onClick={() => handleSwitchScreen('welcome')} 
              className={`remote-nav-btn ${gameState?.activeGame === 'welcome' ? 'active' : ''}`}
            >
              welcome screen
            </button>
            <button 
              onClick={() => handleSwitchScreen('jeopardy')} 
              className={`remote-nav-btn ${gameState?.activeGame === 'jeopardy' ? 'active' : ''}`}
            >
              jeopardy game
            </button>
            <button 
              onClick={() => handleSwitchScreen(null)} 
              className={`remote-nav-btn ${!gameState?.activeGame ? 'active' : ''}`}
            >
              leaderboard
            </button>
            <button 
              onClick={() => handleSwitchScreen('finale')} 
              className={`remote-nav-btn ${gameState?.activeGame === 'finale' ? 'active' : ''}`}
            >
              finale screen
            </button>
          </div>

          {/* Only render simple navigation arrows for the finale view */}
          {gameState?.activeGame === 'finale' && (
            <div className="flat-section animate-fade-in" style={{ marginTop: '10px' }}>
              <div className="vertical-actions">
                {(gameState?.finaleStep ?? 0) === 0 && (
                  <button onClick={handleNextFinaleStepAdmin} className="btn-primary" style={{ padding: '8px', fontSize: '16px' }}>
                    →
                  </button>
                )}
                
                {(gameState?.finaleStep ?? 0) > 0 && (gameState?.finaleStep ?? 0) < 5 && (
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', width: '100%' }}>
                    <button onClick={handlePrevFinaleStepAdmin} className="btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '16px' }}>
                      ←
                    </button>
                    <button onClick={handleNextFinaleStepAdmin} className="btn-primary" style={{ flex: 1, padding: '8px', fontSize: '16px' }}>
                      →
                    </button>
                  </div>
                )}
                
                {(gameState?.finaleStep ?? 0) === 5 && (
                  <button onClick={handlePrevFinaleStepAdmin} className="btn-secondary" style={{ padding: '8px', fontSize: '16px' }}>
                    ←
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- SUB-PAGE: Team Management ---
  const renderTeamsView = () => {
    return (
      <div className="admin-subpage-view teams-subpage animate-fade-in">
        <div className="subpage-header">
          <button onClick={() => setAdminView('menu')} className="back-arrow-btn">
            ←
          </button>
          <h2>TEAMS</h2>
        </div>

        <div className="flat-layout" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          {/* Add Team Panel (Flat layout) */}
          <section className="flat-section">
            <h3>create team</h3>
            <form onSubmit={handleCreateTeam} className="goal-builder-form" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                type="text"
                placeholder="team name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                required
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span>color:</span>
                <input
                  type="color"
                  value={newTeamColor}
                  onChange={(e) => setNewTeamColor(e.target.value)}
                  style={{ width: '40px', height: '40px', padding: 0, border: 'none', borderRadius: '50%', cursor: 'pointer', background: 'none' }}
                />
                <span style={{ fontFamily: 'monospace' }}>{newTeamColor}</span>
              </div>
              <button type="submit" className="btn-primary">create</button>
            </form>
          </section>

          {/* Teams List Panel (Flat layout) */}
          <section className="flat-section">
            <h3>configured teams ({teams.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
              {teams.map((t) => {
                const teamPlayers = players.filter((p) => p.team === t.id);
                return (
                  <div key={t.id} style={{ borderLeft: `3px solid ${t.color}`, paddingLeft: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <strong style={{ color: 'var(--text-bright)', fontSize: '15px' }}>{t.name}</strong>
                        <input
                          type="color"
                          value={t.color || '#60a5fa'}
                          onChange={(e) => handleUpdateTeamColor(t.id, e.target.value)}
                          style={{
                            width: '24px',
                            height: '24px',
                            padding: 0,
                            border: 'none',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            background: 'none'
                          }}
                        />
                        <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{t.color}</span>
                      </div>
                      <button
                        onClick={async () => {
                          if (window.confirm(`Delete team "${t.name}"?`)) {
                            const promises = teamPlayers.map(p => updatePlayerTeam(p.uid, ''));
                            await Promise.all(promises);
                            await deleteTeam(t.id);
                            alert('Deleted.');
                          }
                        }}
                        className="delete-goal-btn"
                        style={{ fontSize: '12px' }}
                      >
                        delete
                      </button>
                    </div>

                    {/* Players list stacked vertically, flat */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {teamPlayers.map((p) => (
                        <div key={p.uid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '6px' }}>
                          <span>
                            {p.name} {p.isPlaceholder && <span style={{ fontSize: '9px', color: 'var(--accent)' }}>(pre)</span>}
                          </span>
                          <button
                            onClick={() => updatePlayerTeam(p.uid, '')}
                            style={{ background: 'none', border: 'none', color: '#ff6f61', cursor: 'pointer', fontSize: '12px' }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add player dropdown */}
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          updatePlayerTeam(val, t.id);
                          e.target.value = '';
                        }
                      }}
                      style={{ fontSize: '12px', padding: '6px', width: '100%' }}
                    >
                      <option value="">+ add player...</option>
                      {players.filter(p => p.team !== t.id).map(p => (
                        <option key={p.uid} value={p.uid}>
                          {p.name} {p.team ? `(${teamsMap[p.team]?.name || p.team})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    );
  };

  // --- SUB-PAGE: Player Management ---
  const renderPlayersView = () => {
    return (
      <div className="admin-subpage-view players-subpage animate-fade-in">
        <div className="subpage-header">
          <button onClick={() => setAdminView('menu')} className="back-arrow-btn">
            ←
          </button>
          <h2>PLAYERS</h2>
        </div>

        <div className="flat-layout" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          {/* Add Player Panel */}
          <section className="flat-section">
            <h3>create predefined account</h3>
            <form onSubmit={handleCreatePlayer} className="goal-builder-form" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                type="text"
                placeholder="guest name"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                required
              />
              <select
                value={newPlayerTeam}
                onChange={(e) => setNewPlayerTeam(e.target.value)}
                required
                style={{ width: '100%', padding: '10px' }}
              >
                <option value="">choose table</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <button type="submit" className="btn-primary">create</button>
            </form>
          </section>

          {/* Players List Panel */}
          <section className="flat-section">
            <h3>configured players ({players.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
              {players.map((p) => {
                const pTeam = (teamsMap && teamsMap[p.team]) || fallbackTeam;
                const playerQuests = goalsList.filter(g => g.assignedTo && g.assignedTo.includes(p.uid));

                const isExpanded = expandedPlayerId === p.uid;
                return (
                  <div key={p.uid} style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.03)', padding: '12px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Tappable Points Count */}
                        <div style={{ display: 'inline-block', minWidth: '60px' }}>
                          {editingPointsPlayerId === p.uid ? (
                            <input
                              type="number"
                              value={tempPointsVal}
                              onChange={(e) => setTempPointsVal(e.target.value)}
                              onBlur={() => handleSavePointsDirect(p.uid)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSavePointsDirect(p.uid);
                                if (e.key === 'Escape') setEditingPointsPlayerId(null);
                              }}
                              autoFocus
                              style={{ 
                                width: '70px', 
                                padding: '4px 6px', 
                                fontSize: '14px', 
                                textAlign: 'left',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid var(--accent)',
                                color: '#fff',
                                borderRadius: '6px'
                              }}
                            />
                          ) : (
                            <span 
                              onClick={() => {
                                setEditingPointsPlayerId(p.uid);
                                setTempPointsVal(p.points ?? 0);
                              }}
                              style={{ 
                                cursor: 'pointer', 
                                fontWeight: 'bold', 
                                fontSize: '15px', 
                                color: 'var(--accent)', 
                                borderBottom: '1px dashed var(--accent)',
                                paddingBottom: '2px',
                                userSelect: 'none'
                              }}
                              title="Click to edit points directly"
                            >
                              {p.points ?? 0} pts
                            </span>
                          )}
                        </div>

                        {/* Name (toggles expanded quests/logs) */}
                        <strong 
                          onClick={() => setExpandedPlayerId(isExpanded ? null : p.uid)}
                          style={{ fontSize: '15px', color: 'var(--text-bright)', cursor: 'pointer', userSelect: 'none' }}
                        >
                          {p.name}
                        </strong>

                        {/* Team Badge (toggles team selector inline) */}
                        <span 
                          onClick={() => setActiveTeamSelectorPlayerId(activeTeamSelectorPlayerId === p.uid ? null : p.uid)}
                          style={{
                            fontSize: '11px',
                            padding: '2px 10px',
                            borderRadius: '12px',
                            background: p.team ? pTeam.color : 'rgba(255,255,255,0.08)',
                            color: p.team ? '#000000' : 'var(--text-muted)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            userSelect: 'none',
                            border: '1px solid rgba(255,255,255,0.1)'
                          }}
                          title="Click to change team/table"
                        >
                          {p.team ? pTeam.name : 'None'}
                        </span>
                      </div>
                    </div>

                    {/* Inline Team Selector */}
                    {activeTeamSelectorPlayerId === p.uid && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '8px', marginTop: '4px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', width: '100%', display: 'block', marginBottom: '2px' }}>select table:</span>
                        <button
                          type="button"
                          onClick={() => {
                            updatePlayerTeam(p.uid, '');
                            setActiveTeamSelectorPlayerId(null);
                          }}
                          style={{
                            fontSize: '11px',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            cursor: 'pointer',
                            background: !p.team ? 'var(--text-muted)' : 'rgba(255, 255, 255, 0.03)',
                            color: '#fff'
                          }}
                        >
                          None
                        </button>
                         {teams.map(t => {
                           const isSelected = p.team === t.id;
                           return (
                             <button
                               key={t.id}
                               type="button"
                               onClick={() => {
                                 updatePlayerTeam(p.uid, t.id);
                                 setActiveTeamSelectorPlayerId(null);
                               }}
                               style={{
                                 fontSize: '11px',
                                 padding: '6px 12px',
                                 borderRadius: '8px',
                                 border: `1px solid ${t.color}`,
                                 cursor: 'pointer',
                                 background: isSelected ? t.color : `${t.color}20`,
                                 color: isSelected ? '#000000' : '#ffffff',
                                 fontWeight: 'bold',
                                 boxShadow: isSelected ? `0 0 10px ${t.color}40` : 'none',
                                 transition: 'all 0.2s ease'
                               }}
                             >
                               {t.name}
                             </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Collapsible Details Panel (Quests & Logs) */}
                    {isExpanded && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '5px', paddingLeft: '16px' }}>
                        {/* Side quests list stacked vertically */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 'bold' }}>assigned quests:</span>
                            <button
                              type="button"
                              onClick={() => setShowAddQuestForPlayerId(showAddQuestForPlayerId === p.uid ? null : p.uid)}
                              style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'var(--text-bright)',
                                borderRadius: '50%',
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                fontSize: '20px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                              }}
                              title="Assign new quest"
                            >
                              {showAddQuestForPlayerId === p.uid ? '×' : '+'}
                            </button>
                          </div>
                          {playerQuests.map((g) => {
                            const completions = allCompletedGoals.filter(cg => cg.userId === p.uid && cg.goalId === g.id);
                            const isCompleted = completions.length > 0;
                            return (
                              <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '6px', fontSize: '14px' }}>
                                <span>
                                  {isCompleted ? '✓' : '○'} {g.title} {g.isRepeatable && completions.length > 0 && `(x${completions.length})`}
                                </span>
                                <button 
                                  onClick={() => handleUnassignQuestFromPlayer(p.uid, g.id)}
                                  style={{ background: 'none', border: 'none', color: '#ff6f61', cursor: 'pointer', fontSize: '13px', padding: '4px 8px' }}
                                >
                                  remove
                                </button>
                              </div>
                            );
                          })}
                          
                          {showAddQuestForPlayerId === p.uid && (
                            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '2px' }}>available quests to assign:</span>
                              {goalsList.filter(g => !playerQuests.some(pq => pq.id === g.id)).length === 0 ? (
                                <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>all quests assigned</span>
                              ) : (
                                goalsList.filter(g => !playerQuests.some(pq => pq.id === g.id)).map(g => (
                                  <button
                                    key={g.id}
                                    onClick={() => handleAssignQuestToPlayer(p.uid, g.id)}
                                    className="btn-secondary"
                                    style={{
                                      fontSize: '14px',
                                      padding: '12px 16px',
                                      borderRadius: '8px',
                                      background: 'rgba(255, 255, 255, 0.04)',
                                      border: '1px solid rgba(255, 255, 255, 0.08)',
                                      color: 'var(--text-bright)',
                                      cursor: 'pointer',
                                      textAlign: 'left',
                                      width: '100%',
                                      display: 'block'
                                    }}
                                    title={`Assign quest: ${g.title} (+${g.points} pts)`}
                                  >
                                    + {g.title} (+{g.points} pts)
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>

                        {/* Expandable History Logs */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
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
                            style={{ fontSize: '11px', padding: '6px', width: 'fit-content' }}
                          >
                            {activeHistoryUserId === p.uid ? 'hide points log' : 'view points log'}
                          </button>
                          
                          {activeHistoryUserId === p.uid && (
                            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '8px', maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                              {playerHistoryLogs.length === 0 ? (
                                <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--text-muted)', textAlign: 'center' }}>no records</p>
                              ) : (
                                playerHistoryLogs.map((log) => (
                                  <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '4px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                                      <span style={{ color: 'var(--text-bright)' }}>{log.description}</span>
                                      <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{log.timestamp?.toDate ? log.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                                    </div>
                                    <strong style={{ color: log.amount > 0 ? '#10b981' : '#ef4444', alignSelf: 'center' }}>
                                      {log.amount > 0 ? '+' : ''}{log.amount}
                                    </strong>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>

                        {/* Delete Player Button */}
                        <button
                          onClick={async () => {
                            if (window.confirm(`Delete player "${p.name}"?`)) {
                              await deletePlayerAdmin(p.uid);
                              alert('Deleted.');
                            }
                          }}
                          className="delete-goal-btn"
                          style={{ fontSize: '11px', alignSelf: 'flex-start', color: '#ff6f61', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          delete player permanently
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    );
  };

  // --- SUB-PAGE: Side Quest Management ---
  const renderQuestsView = () => {
    return (
      <div className="admin-subpage-view quests-subpage animate-fade-in">
        <div className="subpage-header">
          <button onClick={() => setAdminView('menu')} className="back-arrow-btn">
            ←
          </button>
          <h2>SIDE QUESTS</h2>
        </div>

        <div className="flat-layout" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          {/* Add Side Quest Form */}
          <section className="flat-section">
            <h3>create quest</h3>
            <form onSubmit={handleCreateQuestSubmit} className="goal-builder-form" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                type="text"
                placeholder="quest title"
                value={newQuestTitle}
                onChange={(e) => setNewQuestTitle(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="description"
                value={newQuestDesc}
                onChange={(e) => setNewQuestDesc(e.target.value)}
                required
              />
              <input
                type="number"
                placeholder="points reward"
                value={newQuestPoints}
                onChange={(e) => setNewQuestPoints(e.target.value)}
                required
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', cursor: 'pointer', padding: '8px 0', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={newQuestRepeatable}
                  onChange={(e) => setNewQuestRepeatable(e.target.checked)}
                  style={{ width: '24px', height: '24px', cursor: 'pointer', accentColor: 'var(--accent)' }}
                />
                <span>repeatable quest</span>
              </label>
              <button type="submit" className="btn-primary">create</button>
            </form>
          </section>

          {/* Quests Templates List */}
          <section className="flat-section">
            <h3>configured quests ({goalsList.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
              {goalsList.map((g) => (
                <div key={g.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '15px' }}>
                  {editingQuestId === g.id ? (
                    <form onSubmit={(e) => handleSaveEditQuest(e, g.id)} className="goal-builder-form" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input
                        type="text"
                        value={editQuestTitle}
                        onChange={(e) => setEditQuestTitle(e.target.value)}
                        required
                        placeholder="quest title"
                      />
                      <input
                        type="text"
                        value={editQuestDesc}
                        onChange={(e) => setEditQuestDesc(e.target.value)}
                        required
                        placeholder="description"
                      />
                      <input
                        type="number"
                        value={editQuestPoints}
                        onChange={(e) => setEditQuestPoints(e.target.value)}
                        required
                        placeholder="points"
                      />
                       <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', cursor: 'pointer', padding: '8px 0', userSelect: 'none' }}>
                         <input
                           type="checkbox"
                           checked={editQuestRepeatable}
                           onChange={(e) => setEditQuestRepeatable(e.target.checked)}
                           style={{ width: '24px', height: '24px', cursor: 'pointer', accentColor: 'var(--accent)' }}
                         />
                         <span>repeatable quest</span>
                       </label>
                      <div className="vertical-actions">
                        <button type="submit" className="btn-primary">save</button>
                        <button type="button" onClick={() => setEditingQuestId(null)} className="btn-secondary">cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ fontSize: '15px', color: 'var(--text-bright)' }}>{g.title}</strong>
                          <span style={{ marginLeft: '10px', fontSize: '12px', color: 'var(--accent)', fontWeight: 'bold' }}>+{g.points} pts</span>
                          {g.isRepeatable && <span style={{ marginLeft: '8px', fontSize: '9px', background: 'rgba(139,92,246,0.1)', color: 'var(--accent)', padding: '1px 5px', borderRadius: '10px' }}>repeatable</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button onClick={() => handleStartEditQuest(g)} className="delete-goal-btn" style={{ fontSize: '12px' }}>edit</button>
                          <button onClick={() => handleDeleteQuest(g.id)} className="delete-goal-btn" style={{ fontSize: '12px' }}>delete</button>
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4' }}>{g.description}</p>
                      
                      {/* Assigned players stacked vertically */}
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '5px' }}>
                         <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>assigned guests:</span>
                         {(g.assignedTo || []).map(uid => {
                           const playerObj = players.find(p => p.uid === uid);
                           if (!playerObj) return null;
                           return (
                             <div key={uid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', color: '#000000', fontWeight: 'bold' }}>
                               <span>{playerObj.name}</span>
                               <button onClick={() => handleUnassignQuestFromPlayer(uid, g.id)} style={{ background: 'none', border: 'none', color: '#ff6f61', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', padding: '2px 6px' }}>✕</button>
                             </div>
                           );
                         })}

                         {/* Toggle button to assign quest */}
                         <button
                           type="button"
                           onClick={() => setShowAssignDrawerForQuestId(showAssignDrawerForQuestId === g.id ? null : g.id)}
                           className="btn-secondary"
                           style={{
                             fontSize: '12px',
                             padding: '8px 16px',
                             borderRadius: '8px',
                             background: 'rgba(255, 255, 255, 0.05)',
                             border: '1px solid rgba(255, 255, 255, 0.1)',
                             color: 'var(--text-bright)',
                             cursor: 'pointer',
                             width: 'fit-content',
                             marginTop: '5px',
                             display: 'flex',
                             alignItems: 'center',
                             gap: '6px'
                           }}
                         >
                           {showAssignDrawerForQuestId === g.id ? '✕ Close Assignment' : '+ Assign to Guest'}
                         </button>

                         {/* Toggleable Select table first, then show the people in that table */}
                         {showAssignDrawerForQuestId === g.id && (() => {
                           const activeTeamId = selectedTeamForQuestAssign[g.id] || '';
                           return (
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                               <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', background: 'rgba(0,0,0,0.1)', padding: '8px', borderRadius: '8px' }}>
                                 <span style={{ fontSize: '11px', color: 'var(--text-muted)', alignSelf: 'center', width: '100%', marginBottom: '2px', fontWeight: 'bold' }}>filter guest list by table:</span>
                                 {teams.map(t => {
                                   const isSelected = activeTeamId === t.id;
                                   return (
                                     <button
                                       key={t.id}
                                       type="button"
                                       onClick={() => setSelectedTeamForQuestAssign(prev => ({
                                         ...prev,
                                         [g.id]: isSelected ? '' : t.id
                                       }))}
                                       style={{
                                         fontSize: '11px',
                                         padding: '5px 10px',
                                         borderRadius: '6px',
                                         border: `1px solid ${t.color}`,
                                         background: isSelected ? t.color : `${t.color}15`,
                                         color: isSelected ? '#000000' : '#ffffff',
                                         fontWeight: 'bold',
                                         cursor: 'pointer'
                                       }}
                                     >
                                       {t.name}
                                     </button>
                                   );
                                 })}
                               </div>

                               {activeTeamId ? (
                                 <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingLeft: '4px' }}>
                                   {players.filter(p => p.team === activeTeamId && !g.assignedTo?.includes(p.uid)).length === 0 ? (
                                     <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>all players in this table already assigned</span>
                                   ) : (
                                     players.filter(p => p.team === activeTeamId && !g.assignedTo?.includes(p.uid)).map(p => (
                                       <button
                                         key={p.uid}
                                         onClick={() => handleAssignQuestToPlayer(p.uid, g.id)}
                                         className="btn-secondary"
                                         style={{
                                           fontSize: '11px',
                                           padding: '5px 10px',
                                           borderRadius: '6px',
                                           background: 'rgba(255, 255, 255, 0.05)',
                                           border: '1px solid rgba(255, 255, 255, 0.1)',
                                           color: 'var(--text-bright)',
                                           cursor: 'pointer'
                                         }}
                                       >
                                         + {p.name}
                                       </button>
                                     ))
                                   )}
                                 </div>
                               ) : (
                                 <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: '4px' }}>select a table above to view players</span>
                               )}
                             </div>
                           );
                         })()}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  };

  // --- SUB-PAGE: Jeopardy Category Manager ---
  const renderJeopardyView = () => {
    return (
      <div className="admin-subpage-view jeopardy-subpage animate-fade-in">
        <div className="subpage-header">
          <button onClick={() => setAdminView('menu')} className="back-arrow-btn">
            ←
          </button>
          <h2>JEOPARDY</h2>
        </div>

        <div className="flat-layout" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          {/* Categories List */}
          <section className="flat-section">
            <h3>configured categories ({jeopardyCategories.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
              {jeopardyCategories.map((cat) => (
                <div key={cat.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '14px', color: 'var(--text-bright)' }}>{cat.name}</strong>
                    <button 
                      onClick={async () => {
                        if (window.confirm(`Delete category "${cat.name}"?`)) {
                          await deleteJeopardyCategory(cat.id);
                        }
                      }} 
                      className="delete-goal-btn"
                    >
                      delete
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    {cat.clues.map((clue, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '5px 8px', borderRadius: '6px' }}>
                        <span>{clue.points} pts: {clue.question ? 'configured' : 'empty'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Add Category Form */}
          <section className="flat-section">
            <h3>create category</h3>
            <form onSubmit={handleCreateJeopardyCategory} className="goal-builder-form" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input
                type="text"
                placeholder="category name"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                required
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {[100, 200, 300, 400, 500].map((points) => {
                  const qVal = points === 100 ? clue100Q : points === 200 ? clue200Q : points === 300 ? clue300Q : points === 400 ? clue400Q : clue500Q;
                  const aVal = points === 100 ? clue100A : points === 200 ? clue200A : points === 300 ? clue300A : points === 400 ? clue400A : clue500A;
                  const setQ = points === 100 ? setClue100Q : points === 200 ? setClue200Q : points === 300 ? setClue300Q : points === 400 ? setClue400Q : setClue500Q;
                  const setA = points === 100 ? setClue100A : points === 200 ? setClue200A : points === 300 ? setClue300A : points === 400 ? setClue400A : setClue500A;

                  return (
                    <div key={points} style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '2px solid var(--accent)', paddingLeft: '8px' }}>
                      <strong style={{ fontSize: '12px', color: 'var(--accent)' }}>{points} pts clue</strong>
                      <input
                        type="text"
                        placeholder="question"
                        value={qVal}
                        onChange={(e) => setQ(e.target.value)}
                        required
                      />
                      <input
                        type="text"
                        placeholder="answer"
                        value={aVal}
                        onChange={(e) => setA(e.target.value)}
                        required
                      />
                    </div>
                  );
                })}
              </div>

              <button type="submit" className="btn-primary">
                create category
              </button>
            </form>
          </section>
        </div>
      </div>
    );
  };

  // Main Return Block (Completely header-free, flat subpages)
  return (
    <div className="admin-page">
      {adminView === 'menu' && renderMainMenu()}
      {adminView === 'remote' && renderRemoteView()}
      {adminView === 'teams' && renderTeamsView()}
      {adminView === 'players' && renderPlayersView()}
      {adminView === 'quests' && renderQuestsView()}
      {adminView === 'jeopardy' && renderJeopardyView()}
    </div>
  );
}
