import { useState } from 'react';
import { registerBuzz } from '../firebase/db';

export default function JeopardyBuzzerView({ gameState, profile }) {
  const [isRegistering, setIsRegistering] = useState(false);

  const jeopardyState = gameState?.jeopardy || {};
  const activeClue = jeopardyState.activeClue;
  const buzzedPlayerId = jeopardyState.buzzedPlayerId;
  const buzzedPlayerName = jeopardyState.buzzedPlayerName;
  const buzzerLocked = jeopardyState.buzzerLocked;

  const handleBuzz = async () => {
    if (isRegistering || buzzerLocked || buzzedPlayerId) return;

    setIsRegistering(true);
    try {
      // Vibrate phone if supported
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
      
      const success = await registerBuzz(profile.uid, profile.name);
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

  // State A: No Clue Active - waiting for host to select
  if (!activeClue) {
    return (
      <div className="buzzer-container waiting-mode animate-fade-in">
        <div className="glass-panel waiting-card">
          <div className="pulse-loader">
            <div className="pulse-ring"></div>
            <span className="game-icon">🎮</span>
          </div>
          <h2>Jeopardy Game Active!</h2>
          <p>Get ready! The host is selecting the next clue...</p>
        </div>

        {/* Current User Stats */}
        <div className="glass-panel user-quick-stats">
          <div className="quick-stat">
            <span className="stat-label">YOUR POINTS</span>
            <span className="stat-value text-glow">{profile.points ?? 0}</span>
          </div>
          <div className="quick-stat-divider"></div>
          <div className="quick-stat">
            <span className="stat-label">CURRENT TEAM</span>
            <span className="stat-value team-name" style={{ color: `var(--${userTeam}-primary)` }}>
              {userTeam.toUpperCase()}
            </span>
          </div>
        </div>

        <style>{`
          .buzzer-container {
            display: flex;
            flex-direction: column;
            gap: 20px;
            width: 100%;
            padding: 10px 0;
            text-align: center;
          }

          .waiting-card {
            padding: 40px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
          }

          .waiting-card h2 {
            font-size: 22px;
            background: linear-gradient(135deg, var(--accent) 0%, #38bdf8 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }

          .waiting-card p {
            font-size: 14px;
            color: var(--text-muted);
          }

          /* Radar Pulsing Loader */
          .pulse-loader {
            position: relative;
            width: 80px;
            height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--border-glass);
            margin-bottom: 10px;
          }

          .pulse-ring {
            position: absolute;
            width: 100%;
            height: 100%;
            border: 2px solid var(--accent);
            border-radius: 50%;
            animation: radar 2s infinite linear;
            opacity: 0;
            box-shadow: 0 0 15px var(--accent-glow);
          }

          .game-icon {
            font-size: 32px;
          }

          @keyframes radar {
            0% {
              transform: scale(0.9);
              opacity: 0.8;
            }
            100% {
              transform: scale(1.6);
              opacity: 0;
            }
          }

          /* Quick Stats card */
          .user-quick-stats {
            display: flex;
            justify-content: space-around;
            padding: 20px;
            align-items: center;
          }

          .quick-stat {
            display: flex;
            flex-direction: column;
            gap: 6px;
            flex: 1;
          }

          .stat-label {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.08em;
            color: var(--text-muted);
          }

          .stat-value {
            font-family: var(--font-heading);
            font-size: 28px;
            font-weight: 800;
            color: var(--text-bright);
            line-height: 1;
          }

          .text-glow {
            text-shadow: 0 0 10px var(--accent-glow);
          }

          .team-name {
            font-size: 20px;
            font-weight: 800;
            letter-spacing: 0.02em;
          }

          .quick-stat-divider {
            width: 1px;
            height: 40px;
            background: var(--border-glass);
          }
        `}</style>
      </div>
    );
  }

  // State B: Clue is active - buzzer screen
  const isBuzzedByMe = buzzedPlayerId === profile.uid;
  const isBuzzedBySomeoneElse = buzzedPlayerId && !isBuzzedByMe;

  let buzzerClass = "buzzer-btn active-state";
  let buzzerText = "BUZZ!";
  let statusText = "TAP TO BUZZ IN!";
  
  if (isBuzzedByMe) {
    buzzerClass = "buzzer-btn success-state animate-float";
    buzzerText = "BUZZED!";
    statusText = "YOU GOT IT! ANSWER OUT LOUD!";
  } else if (isBuzzedBySomeoneElse) {
    buzzerClass = "buzzer-btn locked-state";
    buzzerText = "LOCKED";
    statusText = `${buzzedPlayerName} buzzed first!`;
  } else if (buzzerLocked) {
    buzzerClass = "buzzer-btn locked-state";
    buzzerText = "LOCKED";
    statusText = "Buzzer is currently locked.";
  }

  return (
    <div className="buzzer-container active-mode animate-fade-in">
      {/* Category Clue Indicator */}
      <div className="glass-panel clue-indicator-card">
        <span className="clue-category">{activeClue.categoryName}</span>
        <span className="clue-points-pill">{activeClue.points} PTS</span>
      </div>

      {/* Main Buzzer Button Container */}
      <div className="glass-panel main-buzzer-panel">
        <div className="buzzer-wrapper">
          <button 
            onClick={handleBuzz}
            disabled={isRegistering || buzzerLocked || !!buzzedPlayerId}
            className={buzzerClass}
            aria-label="Buzz in"
          >
            <span className="btn-text-content">{buzzerText}</span>
            {/* Ambient glowing outer ring when active */}
            {!buzzedPlayerId && !buzzerLocked && <div className="btn-glow-ring"></div>}
          </button>
        </div>
        <p className={`buzzer-status-label ${isBuzzedByMe ? 'success-text' : isBuzzedBySomeoneElse ? 'locked-text' : 'active-text'}`}>
          {statusText}
        </p>
      </div>

      <style>{`
        .buzzer-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
          text-align: center;
        }

        .clue-indicator-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
        }

        .clue-category {
          font-family: var(--font-heading);
          font-size: 16px;
          font-weight: 800;
          color: var(--text-bright);
          text-align: left;
          letter-spacing: 0.02em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 70%;
        }

        .clue-points-pill {
          background: var(--accent-bg);
          border: 1px solid var(--accent);
          color: var(--accent);
          box-shadow: 0 0 10px var(--accent-glow);
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.05em;
        }

        .main-buzzer-panel {
          padding: 50px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 30px;
        }

        /* Buzzer Button Sizing & Layout */
        .buzzer-wrapper {
          position: relative;
          width: 200px;
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .buzzer-btn {
          width: 180px;
          height: 180px;
          border-radius: 50%;
          border: none;
          font-family: var(--font-heading);
          font-size: 26px;
          font-weight: 900;
          letter-spacing: 0.05em;
          color: var(--text-bright);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          outline: none;
          position: relative;
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
          z-index: 2;
        }

        .buzzer-btn:active {
          transform: scale(0.92);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }

        /* State 1: Active/Ready to Buzz (Green Theme) */
        .active-state {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: 4px solid #34d399;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3), 0 0 20px rgba(16, 185, 129, 0.1);
        }

        .active-state:hover {
          transform: scale(1.03);
          box-shadow: 0 12px 35px rgba(16, 185, 129, 0.4), 0 0 30px rgba(16, 185, 129, 0.2);
        }

        .btn-glow-ring {
          position: absolute;
          top: -10px;
          left: -10px;
          right: -10px;
          bottom: -10px;
          border-radius: 50%;
          border: 2px dashed #10b981;
          animation: spin-pulse 8s infinite linear;
          opacity: 0.6;
        }

        /* State 2: Successful Buzz (Gold Theme) */
        .success-state {
          background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%);
          border: 4px solid #fcd34d;
          box-shadow: 0 10px 40px rgba(251, 191, 36, 0.5), 0 0 30px rgba(251, 191, 36, 0.3);
          animation: buzz-pulse 1.5s infinite alternate;
        }

        /* State 3: Locked / Disabled (Gray/Red Theme) */
        .locked-state {
          background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
          border: 4px solid #475569;
          color: var(--text-muted);
          cursor: not-allowed;
          box-shadow: none;
          transform: none !important;
        }

        .btn-text-content {
          position: relative;
          z-index: 3;
        }

        /* Status Label Text styles */
        .buzzer-status-label {
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .active-text {
          color: #34d399;
          animation: text-pulse 1s infinite alternate;
        }

        .success-text {
          color: #fbbf24;
          text-shadow: 0 0 10px rgba(251, 191, 36, 0.4);
        }

        .locked-text {
          color: #f87171;
        }

        /* Keyframes */
        @keyframes spin-pulse {
          0% {
            transform: rotate(0deg) scale(0.98);
            opacity: 0.3;
          }
          50% {
            transform: rotate(180deg) scale(1.02);
            opacity: 0.7;
          }
          100% {
            transform: rotate(360deg) scale(0.98);
            opacity: 0.3;
          }
        }

        @keyframes buzz-pulse {
          0% {
            box-shadow: 0 0 20px rgba(251, 191, 36, 0.3), 0 10px 20px rgba(0, 0, 0, 0.4);
          }
          100% {
            box-shadow: 0 0 40px rgba(251, 191, 36, 0.7), 0 10px 30px rgba(0, 0, 0, 0.5);
          }
        }

        @keyframes text-pulse {
          0% {
            opacity: 0.7;
            transform: scale(0.98);
          }
          100% {
            opacity: 1;
            transform: scale(1.02);
          }
        }
      `}</style>
    </div>
  );
}
