import { useState } from 'react';
import { registerBuzz } from '../firebase/db';
import { STRINGS } from '../constants/strings';
import '../styles/components/JeopardyBuzzerView.css';

export default function JeopardyBuzzerView({ gameState, profile }) {
  const [isRegistering, setIsRegistering] = useState(false);

  const jeopardyState = gameState?.jeopardy || {};
  const activeClue = jeopardyState.activeClue;
  const buzzedPlayerId = jeopardyState.buzzedPlayerId;
  const buzzedPlayerName = jeopardyState.buzzedPlayerName;
  const buzzerLocked = jeopardyState.buzzerLocked;
  const failedPlayers = jeopardyState.failedPlayers || [];

  const handleBuzz = async () => {
    if (isRegistering || buzzerLocked || buzzedPlayerId || failedPlayers.includes(profile.uid)) return;

    setIsRegistering(true);
    try {
      // Vibrate phone if supported
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
      
      const success = await registerBuzz(profile.uid, profile.name, Date.now());
      if (!success) {
        // Vibrate twice quickly to indicate too slow
        if (navigator.vibrate) {
          navigator.vibrate([50, 50, 50]);
        }
      }
    } catch (err) {
      console.error('Error buzzing in:', err);
    } finally {
      setIsRegistering(false);
    }
  };

  const userTeam = profile?.team || 'teal';

  // State B: Clue is active - buzzer screen
  const isBuzzedByMe = buzzedPlayerId === profile.uid;
  const isBuzzedBySomeoneElse = buzzedPlayerId && !isBuzzedByMe;
  const hasFailed = failedPlayers.includes(profile.uid);

  let buzzerClass = "buzzer-btn active-state";
  let buzzerText = STRINGS.jeopardyBuzzer.buzz;
  let statusText = activeClue ? STRINGS.jeopardyBuzzer.tapToBuzz : STRINGS.jeopardyBuzzer.ready;
  
  if (isBuzzedByMe) {
    buzzerClass = "buzzer-btn success-state animate-float";
    buzzerText = STRINGS.jeopardyBuzzer.buzzed;
    statusText = STRINGS.jeopardyBuzzer.successMsg;
  } else if (hasFailed) {
    buzzerClass = "buzzer-btn locked-state";
    buzzerText = STRINGS.jeopardyBuzzer.locked;
    statusText = STRINGS.jeopardyBuzzer.incorrectLocked;
  } else if (isBuzzedBySomeoneElse) {
    buzzerClass = "buzzer-btn locked-state";
    buzzerText = STRINGS.jeopardyBuzzer.locked;
    statusText = STRINGS.jeopardyBuzzer.someoneBuzzedFirst.replace('{name}', buzzedPlayerName);
  } else if (buzzerLocked) {
    buzzerClass = "buzzer-btn locked-state";
    buzzerText = STRINGS.jeopardyBuzzer.locked;
    statusText = STRINGS.jeopardyBuzzer.buzzerLocked;
  }

  return (
    <div className="buzzer-container active-mode animate-fade-in">
      {/* Category Clue Indicator */}
      <div className="glass-panel clue-indicator-card">
        <span className="clue-category">{activeClue ? activeClue.categoryName : STRINGS.jeopardyBuzzer.jeopardyBoardTitle}</span>
        <span className="clue-points-pill">{activeClue ? `${activeClue.points} PTS` : "--"}</span>
      </div>

      {/* Main Buzzer Button Container */}
      <div className="glass-panel main-buzzer-panel">
        <div className="buzzer-wrapper">
          <button 
            onClick={handleBuzz}
            disabled={isRegistering || buzzerLocked || !!buzzedPlayerId || hasFailed}
            className={buzzerClass}
            aria-label="Buzz in"
          >
            <span className="btn-text-content">{buzzerText}</span>
            {/* Ambient glowing outer ring when active */}
            {!buzzedPlayerId && !buzzerLocked && !hasFailed && <div className="btn-glow-ring"></div>}
          </button>
        </div>
        <p className={`buzzer-status-label ${isBuzzedByMe ? 'success-text' : (isBuzzedBySomeoneElse || hasFailed) ? 'locked-text' : 'active-text'}`}>
          {statusText}
        </p>
      </div>

      {/* Current User Stats */}
      <div className="glass-panel user-quick-stats">
        <div className="quick-stat">
          <span className="stat-label">{STRINGS.jeopardyBuzzer.yourPoints}</span>
          <span className="stat-value text-glow">{profile.points ?? 0}</span>
        </div>
        <div className="quick-stat-divider"></div>
        <div className="quick-stat">
          <span className="stat-label">{STRINGS.jeopardyBuzzer.currentTeam}</span>
          <span className="stat-value team-name" style={{ color: `var(--${userTeam}-primary)` }}>
            {userTeam.toUpperCase()}
          </span>
        </div>
      </div>


    </div>
  );
}
