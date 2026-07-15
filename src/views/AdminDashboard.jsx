import { useState, useEffect } from 'react';
import { 
  onLeaderboardChange, 
  onAllUserGoalsChange, 
  approveGoalRequest, 
  adjustPointsAdmin, 
  setGoalTemplate,
  deleteGoalTemplate,
  onGoalsChange,
  addJeopardyCategory,
  deleteJeopardyCategory,
  onJeopardyCategoriesChange,
  listenToGameState,
  updateGameState,
  updateUserSideQuest
} from '../firebase/db';
import { TEAMS } from '../constants/teams';
import { STRINGS } from '../constants/strings';
import { auth } from '../firebase/config';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import '../styles/views/AdminDashboard.css';

export default function AdminDashboard() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPasscode, setAdminPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [isFirebaseAuthed, setIsFirebaseAuthed] = useState(false);

  // TV Remote panel toggle state
  const [isRemoteCollapsed, setIsRemoteCollapsed] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState('main'); // 'main' or 'jeopardy'

  // Admin Data State
  const [players, setPlayers] = useState([]);
  const [goalRequests, setGoalRequests] = useState([]);
  const [goalsList, setGoalsList] = useState([]);
  const [jeopardyCategories, setJeopardyCategories] = useState([]);
  const [gameState, setGameState] = useState(null);

  // Jeopardy Creator Form State
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

  // Form State for creating new goal
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDesc, setNewGoalDesc] = useState('');
  const [newGoalPoints, setNewGoalPoints] = useState('');
  const [formError, setFormError] = useState('');

  // Point Adjustment State
  const [customPoints, setCustomPoints] = useState({}); // { userId: amount }
  const [customDesc, setCustomDesc] = useState({});   // { userId: desc }
  const [playerQuests, setPlayerQuests] = useState({}); // { userId: questText }

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

  // Check Admin Login (uses a simple local passcode for security, e.g. ADMIN2026)
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPasscode.trim().toUpperCase() === 'ADMIN2026') {
      setIsAdminAuthenticated(true);
      setPasscodeError('');
    } else {
      setPasscodeError(STRINGS.admin.gateError);
    }
  };

  // Subscribe to collections once BOTH panel is unlocked and Firebase is authed
  useEffect(() => {
    if (isAdminAuthenticated && isFirebaseAuthed) {
      const unsubPlayers = onLeaderboardChange((data) => {
        setPlayers(data);
      });
      const unsubRequests = onAllUserGoalsChange((data) => {
        setGoalRequests(data);
      });
      const unsubGoals = onGoalsChange((data) => {
        setGoalsList(data);
      });
      const unsubJeopardy = onJeopardyCategoriesChange((data) => {
        setJeopardyCategories(data);
      });
      const unsubGame = listenToGameState((data) => {
        setGameState(data);
      });

      return () => {
        unsubPlayers();
        unsubRequests();
        unsubGoals();
        unsubJeopardy();
        unsubGame();
      };
    }
  }, [isAdminAuthenticated, isFirebaseAuthed]);

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
      alert("Category created successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save category: " + err.message);
    }
  };

  // Approve a goal request
  const handleApproveRequest = async (userGoalId) => {
    try {
      await approveGoalRequest(userGoalId);
    } catch (err) {
      console.error(err);
      alert('Failed to approve request: ' + err.message);
    }
  };

  // Quick point adjustment
  const handleQuickAdjust = async (userId, amount) => {
    try {
      const desc = amount > 0 ? `Awarded by host` : `Deducted by host`;
      await adjustPointsAdmin(userId, amount, desc);
    } catch (err) {
      console.error(err);
      alert(STRINGS.admin.adjustErrorFailed + err.message);
    }
  };

  // Custom point adjustment form
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

  // Update user's side quest
  const handleUpdateQuest = async (userId) => {
    const quest = playerQuests[userId];
    if (quest === undefined) return;
    try {
      await updateUserSideQuest(userId, quest);
      alert('Side quest updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to update side quest: ' + err.message);
    }
  };

  // Create goal template
  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (!newGoalTitle.trim() || !newGoalPoints) {
      setFormError(STRINGS.admin.builderError);
      return;
    }

    setFormError('');
    const goalId = 'goal_' + Date.now();
    try {
      await setGoalTemplate(goalId, newGoalTitle, newGoalDesc, newGoalPoints);
      setNewGoalTitle('');
      setNewGoalDesc('');
      setNewGoalPoints('');
    } catch (err) {
      console.error(err);
      setFormError(STRINGS.admin.builderErrorFailed);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      try {
        await deleteGoalTemplate(goalId);
      } catch (err) {
        console.error(err);
        alert('Failed to delete goal.');
      }
    }
  };

  // TV Remote Actions
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

  // Render Gatekeep Screen
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

  // Render Main Admin Panel
  return (
    <div className="admin-page">
      <header className="admin-header glass-panel">
        <h1>{STRINGS.admin.headerTitle}</h1>
        <button onClick={() => setIsAdminAuthenticated(false)} className="btn-secondary logout-btn">{STRINGS.admin.headerLock}</button>
      </header>

      {/* TV Screen Remote Control Panel */}
      <section className="glass-panel admin-remote-panel">
        <div className="remote-header" onClick={() => setIsRemoteCollapsed(!isRemoteCollapsed)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>📺</span>
            <h2 style={{ margin: 0, fontSize: '16px', letterSpacing: '0.05em' }}>TV SCREEN REMOTE CONTROL</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="remote-status-badge">
              TV Screen: <strong style={{ color: 'var(--accent)' }}>{(gameState?.activeGame || 'leaderboard').toUpperCase()}</strong>
            </span>
            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{isRemoteCollapsed ? '▼' : '▲'}</span>
          </div>
        </div>

        {!isRemoteCollapsed && (
          <div className="remote-body" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                  Jeopardy
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
              <div className="remote-sub-card glass-panel animate-fade-in" style={{ padding: '15px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.01)' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--text-muted)' }}>WELCOME SCREEN CONTROLS</h4>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button 
                    onClick={handleReleaseBalloonsAdmin} 
                    disabled={gameState?.welcomeState === 'released'}
                    className="btn-primary" 
                    style={{ flex: 1 }}
                  >
                    {gameState?.welcomeState === 'released' ? '🎈 Balloons Released! (Redirecting...)' : '🎈 Release Balloons & Redirect'}
                  </button>
                </div>
              </div>
            )}

            {gameState?.activeGame === 'jeopardy' && (
              <div className="remote-sub-card glass-panel animate-fade-in" style={{ padding: '15px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.01)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
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
                  /* Active Clue remote interface */
                  <div className="remote-active-clue-box glass-panel" style={{ padding: '15px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--accent)', marginBottom: '8px', fontWeight: 'bold' }}>
                      <span>{gameState.jeopardy.activeClue.categoryName}</span>
                      <span>{gameState.jeopardy.activeClue.points} Points</span>
                    </div>
                    <p style={{ margin: '0 0 10px 0', fontSize: '14px', fontStyle: 'italic' }}>“{gameState.jeopardy.activeClue.question}”</p>
                    <p style={{ margin: '0 0 15px 0', fontSize: '13px', color: '#10b981', fontWeight: '600' }}>Answer: {gameState.jeopardy.activeClue.answer}</p>

                    {/* Buzzer remote status */}
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '6px', textAlign: 'center', marginBottom: '15px' }}>
                      {gameState.jeopardy.buzzedPlayerId ? (
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Buzzed In!</div>
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
                  /* Clue Selector board for Admin */
                  <div>
                    <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: 'var(--text-muted)' }}>Tap a clue to show it on the TV:</p>
                    {jeopardyCategories.length === 0 ? (
                      <p style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--text-muted)' }}>No categories configured yet. Go to the Jeopardy Manager tab to add some.</p>
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
              <div className="remote-sub-card glass-panel animate-fade-in" style={{ padding: '15px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.01)' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--text-muted)' }}>FINALE SEQUENCE REVEALS</h4>
                
                {/* Step indicator bar */}
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
                
                {/* Step indicators */}
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
              <div className="remote-sub-card glass-panel animate-fade-in" style={{ padding: '15px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.01)', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  The TV page is currently showing the leaderboard. Use the buttons above to switch to other screens.
                </p>
              </div>
            )}

            {gameState?.activeGame === 'goodbye' && (
              <div className="remote-sub-card glass-panel animate-fade-in" style={{ padding: '15px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.01)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>TV is showing the Goodbye wrap-up screen.</span>
                <button onClick={() => handleSwitchScreen(null)} className="btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>
                  Return to Leaderboard
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="admin-tab-nav glass-panel">
        <button 
          className={`tab-nav-btn ${activeTab === 'main' ? 'active' : ''}`} 
          onClick={() => setActiveTab('main')}
        >
          {STRINGS.admin.tabMain}
        </button>
        <button 
          className={`tab-nav-btn ${activeTab === 'jeopardy' ? 'active' : ''}`} 
          onClick={() => setActiveTab('jeopardy')}
        >
          {STRINGS.admin.tabJeopardy}
        </button>
      </div>

      {activeTab === 'main' ? (
        <main className="admin-main-container">
          
          {/* Left Column: Requests and Goals Templates */}
          <div className="admin-col">
            
            {/* Approval Queue Section */}
            <section className="glass-panel admin-section">
              <h3>{STRINGS.admin.queueTitle.replace('{count}', goalRequests.length)}</h3>
              {goalRequests.length === 0 ? (
                <p className="empty-msg">{STRINGS.admin.queueEmpty}</p>
              ) : (
                <div className="queue-list">
                  {goalRequests.map((req) => (
                    <div key={req.id} className="queue-card animate-slide-in">
                      <div className="queue-info">
                        <span className="queue-player">{req.userName}</span>
                        <span className="queue-goal">{req.goalTitle}</span>
                        <span className="queue-points">+{req.points} pts</span>
                      </div>
                      <button
                        onClick={() => handleApproveRequest(req.id)}
                        className="btn-primary approve-btn"
                      >
                        {STRINGS.admin.queueApproveBtn}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Goal Template Builder */}
            <section className="glass-panel admin-section">
              <h3>{STRINGS.admin.builderTitle}</h3>
              <form onSubmit={handleCreateGoal} className="goal-builder-form">
                <input
                  type="text"
                  placeholder={STRINGS.admin.builderTitlePlaceholder}
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                />
                <input
                  type="text"
                  placeholder={STRINGS.admin.builderDescPlaceholder}
                  value={newGoalDesc}
                  onChange={(e) => setNewGoalDesc(e.target.value)}
                />
                <input
                  type="number"
                  placeholder={STRINGS.admin.builderPointsPlaceholder}
                  value={newGoalPoints}
                  onChange={(e) => setNewGoalPoints(e.target.value)}
                />
                {formError && <div className="error-message">{formError}</div>}
                <button type="submit" className="btn-primary">{STRINGS.admin.builderAddBtn}</button>
              </form>

              <div className="goals-templates-list">
                <h4>{STRINGS.admin.templatesTitle}</h4>
                {goalsList.map((g) => (
                  <div key={g.id} className="template-item">
                    <div className="template-info">
                      <span className="template-title">{g.title}</span>
                      <span className="template-pts">({g.points} pts)</span>
                    </div>
                    <button onClick={() => handleDeleteGoal(g.id)} className="delete-goal-btn">✕</button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: Player Manager */}
          <div className="admin-col">
            <section className="glass-panel admin-section players-section">
              <h3>{STRINGS.admin.playersTitle}</h3>
              {players.length === 0 ? (
                <p className="empty-msg">{STRINGS.admin.playersEmpty}</p>
              ) : (
                <div className="players-admin-list">
                  {players.map((p) => {
                    const pTeam = TEAMS[p.team] || TEAMS.blue;
                    return (
                      <div key={p.uid} className="player-admin-card" style={{ borderLeftColor: pTeam.color }}>
                        <div className="player-card-header">
                          <div className="header-meta">
                            <span className="player-name-bold">{p.name}</span>
                            <span className="player-team-tag" style={{ color: pTeam.color }}>{pTeam.name}</span>
                          </div>
                          <span className="player-points-tag">{p.points ?? 0} pts</span>
                        </div>

                        {/* Side Quest Assignment */}
                        <div style={{ marginTop: '10px', fontSize: '13px', padding: '0 5px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Quest: </span>
                          <span style={{ fontWeight: '500', color: 'var(--text-bright)' }}>
                            {p.sideQuest ? `“${p.sideQuest}”` : <em style={{ color: 'var(--text-muted)' }}>No quest assigned</em>}
                          </span>
                        </div>
                        <div className="custom-adjust-row" style={{ marginTop: '10px', gap: '8px', padding: '0 5px' }}>
                          <input
                            type="text"
                            placeholder="Assign or edit secret side quest..."
                            value={playerQuests[p.uid] !== undefined ? playerQuests[p.uid] : (p.sideQuest || '')}
                            onChange={(e) => setPlayerQuests(prev => ({ ...prev, [p.uid]: e.target.value }))}
                            style={{ flex: 1, fontSize: '12px', padding: '8px 10px', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', color: 'var(--text-bright)' }}
                          />
                          <button
                            onClick={() => handleUpdateQuest(p.uid)}
                            className="btn-secondary"
                            style={{ fontSize: '11px', padding: '8px 12px', whiteSpace: 'nowrap' }}
                          >
                            Save Quest
                          </button>
                        </div>

                        {/* Adjustment Tools */}
                        <div className="adjustment-tools">
                          {/* Quick adjust row */}
                          <div className="quick-adjust-row">
                            <button onClick={() => handleQuickAdjust(p.uid, 10)} className="btn-quick">+10</button>
                            <button onClick={() => handleQuickAdjust(p.uid, 50)} className="btn-quick">+50</button>
                            <button onClick={() => handleQuickAdjust(p.uid, -10)} className="btn-quick">-10</button>
                            <button onClick={() => handleQuickAdjust(p.uid, -50)} className="btn-quick">-50</button>
                          </div>
                          {/* Custom Adjust row */}
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
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

        </main>
      ) : (
        <main className="admin-main-container">
          
          {/* Left Column: Configured Jeopardy Categories List */}
          <div className="admin-col">
            <section className="glass-panel admin-section">
              <h3>{STRINGS.admin.jeopardyConfiguredTitle.replace('{count}', jeopardyCategories.length)}</h3>
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

          {/* Right Column: Add Category Form */}
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

        </main>
      )}


    </div>
  );
}
// We also need to import deleteDoc from firebase/firestore if not defined elsewhere.
// db.js handles goal deletion inside. We will use db's templates.
