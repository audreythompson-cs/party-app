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

  const handleClaim = async (goalId, goalTitle, points) => {
    setSubmittingId(goalId);
    try {
      await claimGoal(profile.uid, profile.name, goalId, goalTitle, points);
      // Real-time snapshot will automatically update UI to 'pending'
    } catch (err) {
      console.error(err);
      alert(STRINGS.goals.claimFailed);
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
                  <span className="goal-points font-heading">+{goal.points} {STRINGS.leaderboard.pointsUnit}</span>
                </div>

                <div className="goal-actions">
                  {status === 'available' && (
                    <button
                      onClick={() => handleClaim(goal.id, goal.title, goal.points)}
                      disabled={submittingId === goal.id}
                      className="btn-primary claim-btn"
                    >
                      {submittingId === goal.id ? STRINGS.goals.claimButtonClaiming : STRINGS.goals.claimButton}
                    </button>
                  )}

                  {status === 'pending' && (
                    <button disabled className="btn-secondary pending-btn">
                      {STRINGS.goals.pendingStatus}
                    </button>
                  )}

                  {status === 'completed' && (
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
