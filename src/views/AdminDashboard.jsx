import { useState, useEffect } from 'react';
import { 
  onLeaderboardChange, 
  onAllUserGoalsChange, 
  approveGoalRequest, 
  adjustPointsAdmin, 
  setGoalTemplate,
  deleteGoalTemplate,
  onGoalsChange
} from '../firebase/db';
import { TEAMS } from '../constants/teams';
import { STRINGS } from '../constants/strings';
import { auth } from '../firebase/config';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

export default function AdminDashboard() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPasscode, setAdminPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [isFirebaseAuthed, setIsFirebaseAuthed] = useState(false);

  // Admin Data State
  const [players, setPlayers] = useState([]);
  const [goalRequests, setGoalRequests] = useState([]);
  const [goalsList, setGoalsList] = useState([]);

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

      return () => {
        unsubPlayers();
        unsubRequests();
        unsubGoals();
      };
    }
  }, [isAdminAuthenticated, isFirebaseAuthed]);

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
        <style>{`
          .admin-gate-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .admin-gate-card {
            width: 100%;
            max-width: 400px;
            text-align: center;
            padding: 40px 30px;
            border-radius: 20px;
          }
          .gate-form {
            display: flex;
            flex-direction: column;
            gap: 15px;
          }
          .error-message {
            color: #ff6f61;
            font-size: 13px;
          }
        `}</style>
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
                          {p.photoUrl && (
                            <img src={p.photoUrl} alt={p.name} className="admin-player-avatar cartoonified-xs" />
                          )}
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

      <style>{`
        .admin-page {
          min-height: 100vh;
          background: #090614;
          color: var(--text-main);
          padding: 30px;
          display: flex;
          flex-direction: column;
          gap: 25px;
          font-family: var(--font-sans);
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
        }

        .admin-header h1 {
          font-size: 24px;
        }

        .admin-main-container {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 30px;
          flex: 1;
        }

        .admin-col {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .admin-section {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          height: fit-content;
        }

        .admin-section h3 {
          font-size: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 10px;
        }

        .empty-msg {
          color: var(--text-muted);
          font-size: 13px;
          text-align: center;
          padding: 20px 0;
        }

        /* Queue List */
        .queue-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 250px;
          overflow-y: auto;
        }

        .queue-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 12px 16px;
          border-radius: var(--radius-md);
        }

        .queue-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          gap: 2px;
        }

        .queue-player {
          font-weight: 700;
          color: var(--text-bright);
        }

        .queue-goal {
          font-size: 12px;
          color: var(--text-muted);
        }

        .queue-points {
          font-size: 12px;
          font-weight: 600;
          color: var(--accent);
        }

        .approve-btn {
          padding: 6px 12px;
          font-size: 12px;
          border-radius: 8px;
        }

        /* Goal Builder Form */
        .goal-builder-form {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .goals-templates-list {
          margin-top: 15px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .goals-templates-list h4 {
          font-size: 13px;
          color: var(--text-muted);
          text-align: left;
          margin-bottom: 5px;
        }

        .template-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.02);
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 13px;
        }

        .template-info {
          display: flex;
          gap: 6px;
        }

        .template-title {
          font-weight: 600;
          color: var(--text-bright);
        }

        .template-pts {
          color: var(--accent);
        }

        .delete-goal-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
        }

        .delete-goal-btn:hover {
          color: #ff6f61;
        }

        /* Player Manager */
        .players-admin-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
          max-height: 550px;
          overflow-y: auto;
          padding-right: 5px;
        }

        .player-admin-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-left: 4px solid var(--accent);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .player-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-meta {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .admin-player-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .player-name-bold {
          font-weight: 700;
          color: var(--text-bright);
        }

        .player-team-tag {
          font-size: 11px;
          font-weight: 600;
        }

        .player-points-tag {
          font-family: var(--font-heading);
          font-weight: 800;
          font-size: 16px;
          color: var(--text-bright);
        }

        /* Adjustments layout */
        .adjustment-tools {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .quick-adjust-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }

        .btn-quick {
          padding: 6px;
          font-size: 11px;
          font-weight: 700;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.04);
          color: var(--text-main);
        }

        .btn-quick:hover {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-bright);
        }

        .custom-adjust-row {
          display: grid;
          grid-template-columns: 80px 1fr auto;
          gap: 8px;
        }

        .custom-adjust-row input {
          padding: 8px 10px;
          font-size: 12px;
          border-radius: 8px;
        }

        .adjust-apply-btn {
          padding: 8px 14px;
          font-size: 12px;
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
}
// We also need to import deleteDoc from firebase/firestore if not defined elsewhere.
// db.js handles goal deletion inside. We will use db's templates.
