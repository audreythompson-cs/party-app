import { useState, useEffect } from 'react';
import { 
  onLeaderboardChange,
  listenToGameState,
  updateGameState,
  onJeopardyCategoriesChange,
  adjustPointsAdmin
} from '../firebase/db';
import { STRINGS } from '../constants/strings';
import { TEAMS } from '../constants/teams';
import { auth } from '../firebase/config';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// Web Audio API Synthesizer helpers
function playTone(freq, type, duration) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = type || 'sine';
    oscillator.frequency.value = freq;

    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
  } catch (err) {
    console.error('Web Audio API error:', err);
  }
}

function playChime() {
  playTone(880, 'sine', 0.2);
  setTimeout(() => playTone(1100, 'sine', 0.3), 150);
}

function playBuzzIn() {
  playTone(180, 'triangle', 0.15);
  setTimeout(() => playTone(180, 'triangle', 0.15), 100);
}

function playCorrect() {
  playTone(523.25, 'sine', 0.1); 
  setTimeout(() => playTone(659.25, 'sine', 0.1), 80); 
  setTimeout(() => playTone(783.99, 'sine', 0.1), 160); 
  setTimeout(() => playTone(1046.50, 'sine', 0.3), 240); 
}

function playIncorrect() {
  playTone(220, 'sawtooth', 0.3);
}

export default function TVDisplay() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAuthed, setIsAuthed] = useState(false);

  // Jeopardy State variables
  const [gameState, setGameState] = useState(null);
  const [jeopardyCategories, setJeopardyCategories] = useState([]);
  const [deductPoints, setDeductPoints] = useState(false);
  const [lastBuzzedId, setLastBuzzedId] = useState(null);
  const [lastClueId, setLastClueId] = useState(null);

  // Monitor Auth state & log in anonymously behind the scenes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthed(true);
      } else {
        setIsAuthed(false);
        signInAnonymously(auth).catch((err) => {
          console.error('Error authenticating TV display:', err);
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to real-time Leaderboard, game state and categories ONLY when authenticated
  useEffect(() => {
    if (isAuthed) {
      const unsubscribeLeaderboard = onLeaderboardChange((data) => {
        setLeaderboard(data);
      });
      const unsubscribeGame = listenToGameState((data) => {
        setGameState(data);
      });
      const unsubscribeCategories = onJeopardyCategoriesChange((data) => {
        setJeopardyCategories(data);
      });

      return () => {
        unsubscribeLeaderboard();
        unsubscribeGame();
        unsubscribeCategories();
      };
    }
  }, [isAuthed]);

  // Sound effects trigger
  useEffect(() => {
    if (!gameState?.jeopardy) return;
    
    const buzzedId = gameState.jeopardy.buzzedPlayerId;
    const clue = gameState.jeopardy.activeClue;
    const currentClueId = clue ? `${clue.categoryId}_${clue.points}` : null;

    if (buzzedId && buzzedId !== lastBuzzedId) {
      playBuzzIn();
    }
    
    if (currentClueId && currentClueId !== lastClueId) {
      playChime();
    }

    setLastBuzzedId(buzzedId);
    setLastClueId(currentClueId);
  }, [gameState, lastBuzzedId, lastClueId]);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleStartJeopardy = async () => {
    await updateGameState({
      activeGame: 'jeopardy',
      jeopardy: {
        activeClue: null,
        buzzedPlayerId: null,
        buzzedPlayerName: null,
        buzzedTimestamp: null,
        buzzerLocked: false,
        completedClues: [],
        failedPlayers: []
      }
    });
  };

  const handleEndJeopardy = async () => {
    if (window.confirm("Are you sure you want to end Jeopardy and return to the leaderboard?")) {
      await updateGameState({
        activeGame: null,
        jeopardy: null
      });
    }
  };

  const handleSelectClue = async (cat, clueIndex, clue) => {
    const clueId = `${cat.id}_${clue.points}`;
    if (gameState?.jeopardy?.completedClues?.includes(clueId)) return;

    const updatedJeopardy = {
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

  const handleResolveClue = async (isCorrect) => {
    try {
      if (!gameState?.jeopardy) return;
      const clue = gameState.jeopardy.activeClue;
      const playerId = gameState.jeopardy.buzzedPlayerId;
      const clueId = `${clue.categoryId}_${clue.points}`;

      if (isCorrect) {
        playCorrect();
        try {
          await adjustPointsAdmin(playerId, clue.points, `Jeopardy Correct: ${clue.categoryName}`);
        } catch (err) {
          console.error("Failed to adjust points:", err);
        }

        const completed = [...(gameState.jeopardy.completedClues || []), clueId];
        await updateGameState({
          jeopardy: {
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
        playIncorrect();
        if (deductPoints) {
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
    } catch (globalErr) {
      console.error("Error in handleResolveClue:", globalErr);
      alert("Error resolving clue: " + globalErr.message);
    }
  };

  const handleSkipClue = async () => {
    if (!gameState?.jeopardy) return;
    const clue = gameState.jeopardy.activeClue;
    const clueId = `${clue.categoryId}_${clue.points}`;
    
    const completed = [...(gameState.jeopardy.completedClues || []), clueId];
    await updateGameState({
      jeopardy: {
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

  // Generate dynamic QR code using public API (points to current origin)
  const joinUrl = window.location.origin;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=ffffff&bgcolor=0c0a1c&data=${encodeURIComponent(joinUrl)}`;

  const getRankEmoji = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const renderActiveClue = () => {
    const clue = gameState.jeopardy.activeClue;
    const isBuzzed = !!gameState.jeopardy.buzzedPlayerId;
    const buzzedName = gameState.jeopardy.buzzedPlayerName;

    return (
      <div className="active-clue-screen animate-scale-up">
        <div className="clue-metadata">
          <span className="category-title">{clue.categoryName}</span>
          <span className="points-label">{clue.points} Points</span>
        </div>

        <div className="glass-panel clue-card-main">
          <p className="clue-text">“{clue.question}”</p>
        </div>

        {/* Buzzer Status Panel */}
        <div className="glass-panel buzzer-status-panel">
          {!isBuzzed ? (
            <div className="buzzers-active-state animate-pulse">
              <span className="glowing-dot"></span>
              <h2>BUZZERS OPEN</h2>
              <p>Waiting for players to buzz in...</p>
            </div>
          ) : (
            <div className="buzzed-in-player-state">
              <div className="buzzed-halo">
                <span className="buzzed-icon">⚡</span>
              </div>
              <h2>{buzzedName} BUZZED IN!</h2>
              <div className="host-actions">
                <button 
                  onClick={() => handleResolveClue(true)} 
                  className="btn-primary success-btn"
                >
                  👍 Correct (+{clue.points})
                </button>
                <button 
                  onClick={() => handleResolveClue(false)} 
                  className="btn-secondary error-btn"
                >
                  👎 Incorrect ({deductPoints ? `-${clue.points}` : '0'})
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="active-clue-footer">
          <button onClick={handleSkipClue} className="btn-secondary skip-clue-btn">
            ⏰ Skip / Time's Up
          </button>
        </div>
      </div>
    );
  };

  const renderJeopardyBoard = () => {
    if (jeopardyCategories.length === 0) {
      return (
        <div className="tv-empty-board glass-panel animate-scale-up">
          <h2>Welcome to Jeopardy!</h2>
          <p>No Jeopardy categories are configured yet.</p>
          <p className="instruction-text">
            Go to the Admin Dashboard (<strong>/admin</strong>), open the <strong>Jeopardy Manager</strong> tab, and add categories with questions to populate this board!
          </p>
          <button onClick={handleEndJeopardy} className="btn-secondary" style={{ marginTop: '20px' }}>
            Back to Leaderboard
          </button>
        </div>
      );
    }

    return (
      <div className="jeopardy-container animate-fade-in">
        {/* Controls row */}
        <div className="jeopardy-controls-row">
          <label className="deduct-toggle glass-panel">
            <input 
              type="checkbox" 
              checked={deductPoints} 
              onChange={(e) => setDeductPoints(e.target.checked)} 
            />
            <span>Deduct points on wrong answers</span>
          </label>
          <button onClick={handleEndJeopardy} className="btn-secondary end-game-btn">
            🏁 End Game
          </button>
        </div>

        {/* The Grid */}
        <div className="jeopardy-board glass-panel">
          <div className="jeopardy-grid" style={{ gridTemplateColumns: `repeat(${jeopardyCategories.length}, 1fr)` }}>
            {jeopardyCategories.map((cat) => (
              <div key={cat.id} className="jeopardy-col">
                <div className="jeopardy-cat-header">{cat.name}</div>
                {[100, 200, 300, 400, 500].map((pts, idx) => {
                  const clueId = `${cat.id}_${pts}`;
                  const isCompleted = gameState?.jeopardy?.completedClues?.includes(clueId);
                  const clue = cat.clues[idx] || { points: pts, question: '', answer: '' };
                  return (
                    <button
                      key={pts}
                      disabled={isCompleted || !clue.question}
                      onClick={() => handleSelectClue(cat, idx, clue)}
                      className={`jeopardy-clue-card ${isCompleted ? 'completed' : ''} ${!clue.question ? 'empty-clue' : ''}`}
                    >
                      {!clue.question ? '—' : isCompleted ? '' : `${pts}`}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Scoreboard at Bottom */}
        <div className="jeopardy-scoreboard glass-panel">
          <h3>SCORES</h3>
          <div className="scoreboard-players">
            {leaderboard.length === 0 ? (
              <p className="no-scores-msg">No players registered yet.</p>
            ) : (
              leaderboard.slice(0, 10).map((p) => {
                const pTeam = TEAMS[p.team] || TEAMS.teal;
                return (
                  <div key={p.uid} className="scoreboard-player-pill" style={{ borderLeftColor: pTeam.color }}>
                    <span className="p-name">{p.name}</span>
                    <span className="p-pts">{p.points ?? 0} pts</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  const isJeopardyActive = gameState?.activeGame === 'jeopardy';

  return (
    <div className="tv-page">
      {/* Cosmic background glows */}
      <div className="space-glow glow-1"></div>
      <div className="space-glow glow-2"></div>

      {/* Top Header Panel */}
      <header className="tv-header">
        <div className="tv-header-left">
          <span className="logo-icon">🎓</span>
          <h1>{isJeopardyActive ? "JEOPARDY MODE" : STRINGS.tv.title}</h1>
        </div>
        <div className="tv-header-right">
          <span className="tv-clock">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </header>

      {isJeopardyActive ? (
        // Jeopardy Screens
        gameState.jeopardy?.activeClue ? renderActiveClue() : renderJeopardyBoard()
      ) : (
        // Standard Leaderboard Screens
        <div className="tv-content">
          {/* Left Side: Entry Card & QR code */}
          <section className="tv-join-card glass-panel animate-scale-up">
            <h2>{STRINGS.tv.joinText}</h2>
            <p className="tv-join-instructions">{STRINGS.tv.scanQr}</p>
            
            <div className="qr-container">
              <img src={qrCodeUrl} alt="Join QR Code" className="qr-image" />
              <div className="qr-border-corner top-left"></div>
              <div className="qr-border-corner top-right"></div>
              <div className="qr-border-corner bottom-left"></div>
              <div className="qr-border-corner bottom-right"></div>
            </div>
            
            <div className="join-url-pill" style={{ marginBottom: '20px' }}>
              <span className="join-url-label">Visit:</span>
              <span className="join-url-text">{joinUrl.replace(/(^\w+:|^)\/\//, '')}</span>
            </div>

            <button onClick={handleStartJeopardy} className="btn-primary start-jeopardy-tv-btn">
              🎮 Start Jeopardy
            </button>
          </section>

          {/* Right Side: Ranks Board */}
          <section className="tv-leaderboard glass-panel">
            <div className="board-header">
              <span className="col-rank">{STRINGS.tv.rankHeader}</span>
              <span className="col-avatar"></span>
              <span className="col-player">{STRINGS.tv.playerHeader}</span>
              <span className="col-score">{STRINGS.tv.scoreHeader}</span>
            </div>

            {leaderboard.length === 0 ? (
              <div className="tv-empty-state">
                <div className="tv-empty-spinner"></div>
                <p>{STRINGS.leaderboard.noPlayers}</p>
              </div>
            ) : (
              <div className="tv-players-container">
                {leaderboard.map((player, index) => {
                  const rank = index + 1;
                  const playerTeam = TEAMS[player.team] || TEAMS.teal;
                  const isTopThree = rank <= 3;

                  return (
                    <div 
                      key={player.uid} 
                      className={`tv-player-row animate-slide-in delay-${Math.min(rank, 10)} ${isTopThree ? `top-${rank}` : ''}`}
                      style={{
                        '--player-accent': playerTeam.color,
                        '--player-glow': playerTeam.glow,
                        '--player-bg': playerTeam.accentBg
                      }}
                    >
                      <div className="col-rank">
                        <span className={`tv-rank-text ${isTopThree ? 'rank-highlight' : ''}`}>
                          {getRankEmoji(rank)}
                        </span>
                      </div>

                      <div className="col-avatar">
                        <div className="tv-avatar-frame">
                          {player.photoUrl ? (
                            <img 
                              src={player.photoUrl} 
                              alt={player.name} 
                              className="tv-avatar-img cartoonified-tv" 
                            />
                          ) : (
                            <div className="tv-avatar-placeholder">👤</div>
                          )}
                        </div>
                      </div>

                      <div className="col-player">
                        <div className="tv-player-meta">
                          <span className="tv-player-name">{player.name}</span>
                          <span className="tv-team-badge" style={{ borderColor: playerTeam.color, color: playerTeam.color }}>
                            {playerTeam.name}
                          </span>
                        </div>
                      </div>

                      <div className="col-score">
                        <span className="tv-score-val">{player.points ?? 0}</span>
                        <span className="tv-score-unit">pts</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      <style>{`
        .tv-page {
          min-height: 100vh;
          width: 100vw;
          background: #080612;
          color: var(--text-main);
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
          padding: 30px 40px;
          font-family: var(--font-sans);
        }

        /* Ambient Glowing Backgrounds */
        .space-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          z-index: 1;
          pointer-events: none;
          opacity: 0.15;
        }

        .glow-1 {
          top: -10%;
          left: -10%;
          width: 50vw;
          height: 50vw;
          background: radial-gradient(circle, #a855f7 0%, transparent 70%);
        }

        .glow-2 {
          bottom: -10%;
          right: -10%;
          width: 50vw;
          height: 50vw;
          background: radial-gradient(circle, #06b6d4 0%, transparent 70%);
        }

        /* Top TV Header styling */
        .tv-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          z-index: 2;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 20px;
        }

        .tv-header-left {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .logo-icon {
          font-size: 40px;
        }

        .tv-header h1 {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: 0.05em;
          background: linear-gradient(135deg, #ffffff 0%, #a855f7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .tv-clock {
          font-family: var(--font-heading);
          font-size: 28px;
          font-weight: 700;
          color: var(--text-bright);
          letter-spacing: 0.05em;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
        }

        /* Content split grid */
        .tv-content {
          flex: 1;
          display: grid;
          grid-template-columns: 380px 1fr;
          gap: 40px;
          z-index: 2;
          min-height: 0; /* Important to enable overflow scrolling inside columns */
        }

        /* Join QR Code Card styling */
        .tv-join-card {
          padding: 40px 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: fit-content;
          text-align: center;
          gap: 20px;
          border-radius: 28px;
          border-color: rgba(255, 255, 255, 0.06);
          background: rgba(13, 10, 27, 0.5);
        }

        .tv-join-card h2 {
          font-size: 26px;
          background: linear-gradient(135deg, #06b6d4 0%, #a855f7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .tv-join-instructions {
          font-size: 15px;
          color: var(--text-muted);
          line-height: 1.6;
        }

        /* QR Frame corners styling */
        .qr-container {
          position: relative;
          padding: 15px;
          background: #0c0a1c;
          border-radius: 20px;
          margin: 15px 0;
          box-shadow: 0 0 40px rgba(0, 0, 0, 0.6);
        }

        .qr-image {
          width: 200px;
          height: 200px;
          display: block;
          border-radius: 8px;
        }

        .qr-border-corner {
          position: absolute;
          width: 20px;
          height: 20px;
          border: 3px solid #a855f7;
        }

        .top-left { top: 0; left: 0; border-right: none; border-bottom: none; border-top-left-radius: 12px; }
        .top-right { top: 0; right: 0; border-left: none; border-bottom: none; border-top-right-radius: 12px; }
        .bottom-left { bottom: 0; left: 0; border-right: none; border-top: none; border-bottom-left-radius: 12px; }
        .bottom-right { bottom: 0; right: 0; border-left: none; border-top: none; border-bottom-right-radius: 12px; }

        .join-url-pill {
          display: flex;
          gap: 8px;
          padding: 10px 18px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 30px;
          font-size: 14px;
        }

        .join-url-label {
          color: var(--text-muted);
          font-weight: 500;
        }

        .join-url-text {
          color: var(--text-bright);
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        /* TV Leaderboard styling */
        .tv-leaderboard {
          border-radius: 28px;
          background: rgba(13, 10, 27, 0.4);
          border-color: rgba(255, 255, 255, 0.06);
          padding: 30px;
          display: flex;
          flex-direction: column;
          min-height: 0; /* Crucial for scrolling */
        }

        .board-header {
          display: flex;
          align-items: center;
          padding: 0 20px 15px 20px;
          border-bottom: 2px solid rgba(255, 255, 255, 0.06);
          font-weight: 700;
          font-size: 14px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          gap: 20px;
        }

        .tv-players-container {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 15px;
          padding-right: 8px;
        }

        /* Hide Scrollbar */
        .tv-players-container::-webkit-scrollbar {
          width: 0;
          height: 0;
        }

        .tv-player-row {
          display: flex;
          align-items: center;
          padding: 14px 24px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 18px;
          gap: 20px;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Top 3 Player styles */
        .top-1 {
          background: linear-gradient(90deg, rgba(234, 179, 8, 0.08) 0%, rgba(234, 179, 8, 0.02) 100%);
          border-color: rgba(234, 179, 8, 0.3);
          box-shadow: 0 0 15px rgba(234, 179, 8, 0.1);
        }
        .top-2 {
          background: linear-gradient(90deg, rgba(148, 163, 184, 0.08) 0%, rgba(148, 163, 184, 0.02) 100%);
          border-color: rgba(148, 163, 184, 0.2);
        }
        .top-3 {
          background: linear-gradient(90deg, rgba(180, 83, 9, 0.08) 0%, rgba(180, 83, 9, 0.02) 100%);
          border-color: rgba(180, 83, 9, 0.2);
        }

        /* Column spacing */
        .col-rank { width: 50px; text-align: center; }
        .col-avatar { width: 56px; }
        .col-player { flex: 1; text-align: left; }
        .col-score { width: 140px; text-align: right; }

        .tv-rank-text {
          font-family: var(--font-heading);
          font-size: 18px;
          font-weight: 700;
          color: var(--text-muted);
        }

        .rank-highlight {
          font-size: 24px;
        }

        .tv-avatar-frame {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid var(--player-accent);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 10px var(--player-glow);
        }

        .tv-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .cartoonified-tv {
          filter: contrast(1.25) saturate(1.7) brightness(1.05) url(#cartoon-filter);
        }

        .tv-avatar-placeholder {
          font-size: 24px;
        }

        .tv-player-meta {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .tv-player-name {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-bright);
        }

        .tv-team-badge {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border: 1.5px solid currentColor;
          padding: 3px 8px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.02);
        }

        .tv-score-val {
          font-family: var(--font-heading);
          font-size: 26px;
          font-weight: 800;
          color: var(--text-bright);
        }

        .top-1 .tv-score-val {
          color: #eab308;
          text-shadow: 0 0 10px rgba(234, 179, 8, 0.4);
        }

        .tv-score-unit {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-left: 5px;
        }

        .tv-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          gap: 20px;
        }

        .tv-empty-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(255, 255, 255, 0.05);
          border-top-color: var(--accent, #a855f7);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .start-jeopardy-tv-btn {
          margin-top: 15px;
          font-size: 14px;
          padding: 12px 20px;
        }

        /* Jeopardy Board styles */
        .jeopardy-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 25px;
          min-height: 0;
          z-index: 2;
        }

        .jeopardy-controls-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .deduct-toggle {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 18px;
          border-radius: 12px;
          font-size: 14px;
          color: var(--text-main);
          cursor: pointer;
        }

        .deduct-toggle input {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .jeopardy-board {
          flex: 1;
          padding: 20px;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow-y: auto;
        }

        .jeopardy-grid {
          display: grid;
          gap: 15px;
          height: 100%;
        }

        .jeopardy-col {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .jeopardy-cat-header {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 15px 10px;
          border-radius: 12px;
          font-family: var(--font-heading);
          font-size: 16px;
          font-weight: 800;
          color: var(--text-bright);
          text-transform: uppercase;
          text-align: center;
          min-height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          letter-spacing: 0.05em;
          box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        }

        .jeopardy-clue-card {
          flex: 1;
          background: linear-gradient(135deg, rgba(13, 10, 27, 0.8) 0%, rgba(20, 16, 35, 0.9) 100%);
          border: 2px solid rgba(255, 255, 255, 0.05);
          color: #fbbf24;
          font-family: var(--font-heading);
          font-size: 28px;
          font-weight: 800;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 15px rgba(0,0,0,0.3);
          min-height: 70px;
        }

        .jeopardy-clue-card:hover:not(:disabled) {
          transform: scale(1.04);
          border-color: #fbbf24;
          box-shadow: 0 0 15px rgba(251, 191, 36, 0.4);
          filter: brightness(1.15);
        }

        .jeopardy-clue-card.completed {
          opacity: 0.15;
          cursor: not-allowed;
          border-color: transparent;
          background: rgba(255,255,255,0.01);
          box-shadow: none;
        }

        .jeopardy-clue-card.empty-clue {
          opacity: 0.1;
          cursor: not-allowed;
          color: rgba(255,255,255,0.1);
          border-color: transparent;
          box-shadow: none;
        }

        /* Bottom Scoreboard */
        .jeopardy-scoreboard {
          padding: 16px 20px;
          border-radius: 16px;
        }

        .jeopardy-scoreboard h3 {
          font-size: 12px;
          font-weight: 800;
          color: var(--text-muted);
          letter-spacing: 0.1em;
          margin-bottom: 12px;
          text-align: left;
        }

        .scoreboard-players {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding-bottom: 5px;
        }

        .scoreboard-players::-webkit-scrollbar {
          height: 4px;
        }
        .scoreboard-players::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
        }

        .scoreboard-player-pill {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-left: 4px solid var(--accent);
          padding: 8px 16px;
          border-radius: 30px;
          flex-shrink: 0;
        }

        .p-name {
          font-weight: 700;
          color: var(--text-bright);
          font-size: 14px;
        }

        .p-pts {
          font-family: var(--font-heading);
          font-weight: 800;
          font-size: 15px;
          color: #fbbf24;
        }

        .no-scores-msg {
          font-size: 13px;
          color: var(--text-muted);
          text-align: center;
          width: 100%;
        }

        /* Active Clue Screen styles */
        .active-clue-screen {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 30px;
          max-width: 800px;
          margin: 0 auto;
          width: 100%;
          z-index: 2;
        }

        .clue-metadata {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: center;
        }

        .category-title {
          font-family: var(--font-heading);
          font-size: 28px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          background: linear-gradient(135deg, #ffffff 0%, #fbbf24 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .points-label {
          background: rgba(251, 191, 36, 0.08);
          border: 1.5px solid #fbbf24;
          color: #fbbf24;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.05em;
          box-shadow: 0 0 12px rgba(251, 191, 36, 0.25);
        }

        .clue-card-main {
          padding: 50px 40px;
          width: 100%;
          text-align: center;
          border-radius: 24px;
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.5);
        }

        .clue-text {
          font-family: var(--font-heading);
          font-size: 34px;
          font-weight: 600;
          color: var(--text-bright);
          line-height: 1.5;
        }

        .answer-hint-text {
          font-size: 18px;
          color: var(--accent);
          margin-top: 25px;
          font-style: italic;
          opacity: 0.7;
          border-top: 1px dashed rgba(255, 255, 255, 0.08);
          padding-top: 15px;
        }

        /* Buzzer Screen Panel */
        .buzzer-status-panel {
          width: 100%;
          padding: 30px;
          text-align: center;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 180px;
          border-radius: 24px;
        }

        .buzzers-active-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .glowing-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 15px #10b981, 0 0 30px #10b981;
        }

        .buzzers-active-state h2 {
          font-size: 18px;
          color: #10b981;
          letter-spacing: 0.1em;
        }

        .buzzed-in-player-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          width: 100%;
        }

        .buzzed-halo {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: rgba(251, 191, 36, 0.1);
          border: 2px solid #fbbf24;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px rgba(251, 191, 36, 0.3);
          animation: scale-glow 1s infinite alternate;
        }

        .buzzed-icon {
          font-size: 32px;
          color: #fbbf24;
        }

        .buzzed-in-player-state h2 {
          font-size: 24px;
          background: linear-gradient(135deg, #fbbf24 0%, #fcd34d 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .host-actions {
          display: flex;
          gap: 15px;
          margin-top: 5px;
        }

        .success-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .error-btn {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
          border-color: transparent;
        }

        .error-btn:hover {
          background: #ef4444;
          border-color: transparent;
        }

        .active-clue-footer {
          margin-top: 10px;
        }

        .skip-clue-btn {
          font-size: 13px;
          padding: 10px 20px;
        }

        .tv-empty-board {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          text-align: center;
          max-width: 500px;
          margin: 60px auto 0 auto;
          padding: 40px;
          z-index: 2;
        }

        .tv-empty-board h2 {
          font-size: 26px;
          background: linear-gradient(135deg, var(--accent) 0%, #38bdf8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .tv-empty-board p {
          font-size: 15px;
          color: var(--text-muted);
          line-height: 1.6;
        }

        .tv-empty-board .instruction-text {
          font-size: 13px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px dashed rgba(255, 255, 255, 0.08);
          padding: 10px;
          border-radius: 8px;
        }

        @keyframes scale-glow {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 10px rgba(251, 191, 36, 0.2);
          }
          100% {
            transform: scale(1.05);
            box-shadow: 0 0 25px rgba(251, 191, 36, 0.5);
          }
        }
      `}</style>
    </div>
  );
}
