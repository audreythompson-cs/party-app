import { useState, useEffect } from 'react';
import { STRINGS } from '../constants/strings';
import { claimGoal, onGoalsChange, onUserGoalsChange } from '../firebase/db';

export default function GoalsTab({ profile }) {
  const [goals, setGoals] = useState([]);
  const [userGoals, setUserGoals] = useState({});
  const [submittingId, setSubmittingId] = useState(null);

  // Subscribe to all goals & user goal history
  useEffect(() => {
    const unsubscribeGoals = onGoalsChange((data) => {
      setGoals(data);
    });

    const unsubscribeUserGoals = onUserGoalsChange(profile.uid, (data) => {
      setUserGoals(data);
    });

    return () => {
      unsubscribeGoals();
      unsubscribeUserGoals();
    };
  }, [profile.uid]);

  const handleClaim = async (goalId, goalTitle, points) => {
    setSubmittingId(goalId);
    try {
      await claimGoal(profile.uid, profile.name, goalId, goalTitle, points);
      // Real-time snapshot will automatically update UI to 'pending'
    } catch (err) {
      console.error(err);
      alert('Could not submit claim. Please try again.');
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="goals-tab animate-fade-in">
      <div className="goals-header">
        <h3>{STRINGS.goals.title}</h3>
        <p className="subtitle">{STRINGS.goals.subtitle}</p>
      </div>

      {goals.length === 0 ? (
        <div className="glass-panel empty-state">
          <p>{STRINGS.goals.noGoals}</p>
        </div>
      ) : (
        <div className="goals-list">
          {goals.map((goal) => {
            const statusRecord = userGoals[goal.id];
            const status = statusRecord?.status || 'available'; // 'available' | 'pending' | 'completed'

            return (
              <div 
                key={goal.id} 
                className={`goal-card glass-panel status-${status} animate-scale-up`}
              >
                <div className="goal-info">
                  <div className="goal-main">
                    <h4 className="goal-title">{goal.title}</h4>
                    <p className="goal-description">{goal.description}</p>
                  </div>
                  <span className="goal-points font-heading">+{goal.points} pts</span>
                </div>

                <div className="goal-actions">
                  {status === 'available' && (
                    <button
                      onClick={() => handleClaim(goal.id, goal.title, goal.points)}
                      disabled={submittingId === goal.id}
                      className="btn-primary claim-btn"
                    >
                      {submittingId === goal.id ? 'Claiming...' : STRINGS.goals.claimButton}
                    </button>
                  )}

                  {status === 'pending' && (
                    <button disabled className="btn-secondary pending-btn">
                      <span className="action-icon">⏳</span>
                      {STRINGS.goals.pendingStatus}
                    </button>
                  )}

                  {status === 'completed' && (
                    <div className="completed-badge">
                      <span className="action-icon">✓</span>
                      {STRINGS.goals.completedStatus.replace('{points}', goal.points)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .goals-tab {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .goals-header {
          text-align: left;
        }

        .goals-header h3 {
          font-size: 18px;
          margin-bottom: 4px;
        }

        .goals-header .subtitle {
          font-size: 13px;
          color: var(--text-muted);
        }

        .empty-state {
          padding: 40px;
          text-align: center;
          color: var(--text-muted);
        }

        .goals-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .goal-card {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          text-align: left;
          transition: all 0.3s ease;
        }

        .goal-info {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }

        .goal-main {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .goal-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-bright);
        }

        .goal-description {
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.5;
        }

        .goal-points {
          font-family: var(--font-heading);
          font-size: 16px;
          font-weight: 800;
          color: var(--accent);
          background: var(--accent-bg);
          border: 1px solid var(--border-glass);
          padding: 4px 10px;
          border-radius: 20px;
          white-space: nowrap;
        }

        .goal-actions {
          display: flex;
          justify-content: flex-end;
          width: 100%;
        }

        .claim-btn {
          width: 100%;
          padding: 10px 16px;
          font-size: 14px;
        }

        .pending-btn {
          width: 100%;
          padding: 10px 16px;
          font-size: 14px;
          color: var(--text-muted);
          cursor: not-allowed;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .completed-badge {
          width: 100%;
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 600;
          text-align: center;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.25);
          color: #10b981;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .action-icon {
          font-size: 14px;
        }

        /* Status overrides */
        .status-completed {
          border-color: rgba(16, 185, 129, 0.25);
          background: rgba(16, 185, 129, 0.03);
        }

        .status-completed .goal-points {
          color: #10b981;
          background: rgba(16, 185, 129, 0.08);
          border-color: rgba(16, 185, 129, 0.2);
        }

        .status-completed .goal-title {
          color: var(--text-muted);
          text-decoration: line-through;
        }

        .status-pending {
          border-color: rgba(234, 179, 8, 0.2);
        }
      `}</style>
    </div>
  );
}
