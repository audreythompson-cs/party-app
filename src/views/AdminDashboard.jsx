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
  onJeopardyCategoriesChange
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

  // Tabs
  const [activeTab, setActiveTab] = useState('main'); // 'main' or 'jeopardy'

  // Admin Data State
  const [players, setPlayers] = useState([]);
  const [goalRequests, setGoalRequests] = useState([]);
  const [goalsList, setGoalsList] = useState([]);
  const [jeopardyCategories, setJeopardyCategories] = useState([]);

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

      return () => {
        unsubPlayers();
        unsubRequests();
        unsubGoals();
        unsubJeopardy();
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

  // Render Gatekeep Screen
  if (!isAdminAuthenticated) {
    return (
      <div className="admin-gate-page themed-background theme-purple">
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
    <div className="admin-page theme-purple">
      <header className="admin-header glass-panel">
        <h1>{STRINGS.admin.headerTitle}</h1>
        <button onClick={() => setIsAdminAuthenticated(false)} className="btn-secondary logout-btn">{STRINGS.admin.headerLock}</button>
      </header>

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
                    const pTeam = TEAMS[p.team] || TEAMS.teal;
                    return (
                      <div key={p.uid} className="player-admin-card" style={{ borderLeftColor: pTeam.color }}>
                        <div className="player-card-header">
                          <div className="header-meta">
                            <span className="player-name-bold">{p.name}</span>
                            <span className="player-team-tag" style={{ color: pTeam.color }}>{pTeam.name}</span>
                          </div>
                          <span className="player-points-tag">{p.points ?? 0} pts</span>
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
