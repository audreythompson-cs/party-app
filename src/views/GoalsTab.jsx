import { useState, useEffect } from 'react';
import { STRINGS } from '../constants/strings';
import { claimGoal, onGoalsChange, onUserGoalsChange } from '../firebase/db';
import '../styles/views/GoalsTab.css';

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

  const handleClaim = async (goal) => {
    const confirmed = window.confirm('The winners will be audited at the end, so tell the truth!');
    if (!confirmed) return;

    setSubmittingId(goal.id);
    try {
      await claimGoal(profile.uid, profile.name, goal.id, goal.title, goal.points, goal.isRepeatable);
    } catch (err) {
      console.error(err);
      alert(STRINGS.goals.claimFailed + ": " + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  // Filter goals list to only show player's assigned goals
  const myGoals = goals.filter(
    (g) => g.assignedTo && g.assignedTo.includes(profile.uid)
  );

  return (
    <div className="goals-tab animate-fade-in">
      <div className="goals-header">
        <h3>{STRINGS.goals.title}</h3>
      </div>

      {myGoals.length === 0 ? (
        <div className="glass-panel empty-state">
          <p>No side quests assigned to you yet.</p>
        </div>
      ) : (
        <div className="goals-list">
          {myGoals.map((goal) => {
            // Count completed records for this goal
            const completedRecords = Object.values(userGoals).filter(
              (ug) => ug.goalId === goal.id && ug.status === 'completed'
            );
            const completedCount = completedRecords.length;
            const isCompleted = completedCount > 0;

            const isAvailable = goal.isRepeatable || !isCompleted;
            const statusClass = isCompleted ? 'completed' : 'available';

            return (
              <div 
                key={goal.id} 
                className={`goal-card glass-panel status-${statusClass} animate-scale-up`}
              >
                <div className="goal-info">
                  <div className="goal-main">
                    <h4 className="goal-title">
                      {goal.title}
                      {goal.isRepeatable && <span style={{ marginLeft: '10px', fontSize: '11px', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '10px', color: 'var(--accent)' }}>Repeatable</span>}
                    </h4>
                    <p className="goal-description">{goal.description}</p>
                    {completedCount > 0 && (
                      <p style={{ margin: '6px 0 0 0', fontSize: '12px', fontWeight: 'bold', color: '#10b981' }}>
                        ✓ Completed {completedCount} {completedCount === 1 ? 'time' : 'times'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="goal-actions">
                  {isAvailable ? (
                    <button
                      onClick={() => handleClaim(goal)}
                      disabled={submittingId === goal.id}
                      className="btn-primary claim-btn"
                    >
                      {submittingId === goal.id 
                        ? STRINGS.goals.claimButtonClaiming 
                        : `+${goal.points} ${STRINGS.leaderboard.pointsUnit}`
                      }
                    </button>
                  ) : (
                    <div className="completed-badge">
                      {STRINGS.goals.completedStatus.replace('{points}', goal.points)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
