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
import '../styles/views/TVDisplay.css';
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
  const [isAuthed, setIsAuthed] = useState(false);
  const [isBalloonsReleased, setIsBalloonsReleased] = useState(false);

  // Jeopardy State variables
  const [gameState, setGameState] = useState(null);
  const [jeopardyCategories, setJeopardyCategories] = useState([]);
  const deductPoints = gameState?.jeopardy?.deductPoints || false;
  const [lastBuzzedId, setLastBuzzedId] = useState(null);
  const [lastClueId, setLastClueId] = useState(null);
  const [leftBalloonsReleased, setLeftBalloonsReleased] = useState(false);
  const [rightBalloonsReleased, setRightBalloonsReleased] = useState(false);

  // Sync balloon released state
  useEffect(() => {
    setIsBalloonsReleased(gameState?.welcomeState === 'released');
  }, [gameState?.welcomeState]);

  // Reset local balloon release states when not on leaderboard
  useEffect(() => {
    if (gameState?.activeGame) {
      setLeftBalloonsReleased(false);
      setRightBalloonsReleased(false);
    }
  }, [gameState?.activeGame]);

  // Balloon release automatically redirects back to leaderboard after 2.5 seconds
  useEffect(() => {
    if (gameState?.activeGame === 'welcome' && gameState?.welcomeState === 'released') {
      const timer = setTimeout(() => {
        handleBackToLeaderboard();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [gameState?.activeGame, gameState?.welcomeState]);

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


  const handleStartJeopardy = async () => {
    const currentJeopardy = gameState?.jeopardy || {
      activeClue: null,
      buzzedPlayerId: null,
      buzzedPlayerName: null,
      buzzedTimestamp: null,
      buzzerLocked: false,
      completedClues: [],
      failedPlayers: []
    };
    await updateGameState({
      activeGame: 'jeopardy',
      jeopardy: currentJeopardy
    });
  };

  const handleStartWelcome = async () => {
    await updateGameState({
      activeGame: 'welcome',
      welcomeState: null
    });
  };

  const handleStartFinale = async () => {
    await updateGameState({
      activeGame: 'finale',
      finaleStep: 0
    });
  };

  const handleStartGoodbye = async () => {
    await updateGameState({
      activeGame: 'goodbye'
    });
  };

  const handleBackToLeaderboard = async () => {
    await updateGameState({
      activeGame: null,
      welcomeState: null,
      finaleStep: null
    });
  };

  const handleLeftClick = () => {
    setLeftBalloonsReleased(true);
    setTimeout(() => {
      handleStartWelcome();
    }, 2500);
  };

  const handleRightClick = () => {
    setRightBalloonsReleased(true);
    setTimeout(() => {
      handleStartFinale();
    }, 2500);
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
    if (rank === 1) return '1st';
    if (rank === 2) return '2nd';
    if (rank === 3) return '3rd';
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
          <span className="points-label">{STRINGS.tv.cluePoints.replace('{points}', clue.points)}</span>
        </div>

        <div className="glass-panel clue-card-main">
          <p className="clue-text">“{clue.question}”</p>
        </div>

        {/* Buzzer Status Panel */}
        <div className="glass-panel buzzer-status-panel">
          {!isBuzzed ? (
            <div className="buzzers-active-state animate-pulse">
              <span className="glowing-dot"></span>
              <h2>{STRINGS.tv.buzzersOpen}</h2>
              <p>{STRINGS.tv.waitingForBuzz}</p>
            </div>
          ) : (
            <div className="buzzed-in-player-state">
              <div className="buzzed-halo">
                <span className="buzzed-icon">!</span>
              </div>
              <h2>{STRINGS.tv.playerBuzzed.replace('{name}', buzzedName)}</h2>
              <div className="host-actions">
                <button 
                  onClick={() => handleResolveClue(true)} 
                  className="btn-primary success-btn"
                >
                  {STRINGS.tv.correctBtn.replace('{points}', clue.points)}
                </button>
                <button 
                  onClick={() => handleResolveClue(false)} 
                  className="btn-secondary error-btn"
                >
                  {STRINGS.tv.incorrectBtn.replace('{points}', deductPoints ? `-${clue.points}` : '0')}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="active-clue-footer">
          <button onClick={handleSkipClue} className="btn-secondary skip-clue-btn">
            {STRINGS.tv.skipBtn}
          </button>
        </div>
      </div>
    );
  };

  const renderJeopardyBoard = () => {
    if (jeopardyCategories.length === 0) {
      return (
        <div className="tv-empty-board glass-panel animate-scale-up">
          <h2>{STRINGS.tv.jeopardyWelcome}</h2>
          <p>{STRINGS.tv.noCategories}</p>
          <p className="instruction-text">
            {STRINGS.tv.adminInstructions}
          </p>
          <button onClick={handleEndJeopardy} className="btn-secondary" style={{ marginTop: '20px' }}>
            {STRINGS.tv.backToLeaderboard}
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
              onChange={async (e) => {
                await updateGameState({
                  jeopardy: {
                    ...(gameState?.jeopardy || {}),
                    deductPoints: e.target.checked
                  }
                });
              }} 
            />
            <span>{STRINGS.tv.deductToggle}</span>
          </label>
          <button onClick={handleEndJeopardy} className="btn-secondary end-game-btn">
            {STRINGS.tv.endGame}
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
          <h3>{STRINGS.tv.scores}</h3>
          <div className="scoreboard-players">
            {leaderboard.length === 0 ? (
              <p className="no-scores-msg">No players registered yet.</p>
            ) : (
              leaderboard.slice(0, 10).map((p) => {
                const pTeam = TEAMS[p.team] || TEAMS.blue;
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

  const renderWelcome = () => {
    const handleWelcomeClick = () => {
      setIsBalloonsReleased(true);
      setTimeout(() => {
        handleBackToLeaderboard();
      }, 2500);
    };

    const balloonIndices = [1, 2, 3, 4, 5];

    return (
      <div className={`tv-welcome-screen-redesign ${isBalloonsReleased ? 'released' : ''}`}>
        {/* Hand-drawn Welcome Header at the top (Clickable return button) */}
        <div className="welcome-header-container" onClick={handleWelcomeClick}>
          <img
            src="/welcome-header.svg"
            alt="Welcome Header"
            className="welcome-header-image"
          />
        </div>

        {/* Bottom Columns Layout */}
        <div className="welcome-redesign-grid">
          
          {/* Left Side Column: Balloon Bundle + QR Anchor */}
          <div className="welcome-side-column left-side">
            <div className="balloon-bundle">
              {balloonIndices.map((i) => (
                <img
                  key={`left-${i}`}
                  src="/balloon.svg"
                  alt={`Left Balloon ${i}`}
                  className={`balloon-item balloon-${i}`}
                />
              ))}
            </div>
            <img src={qrCodeUrl} alt="Join QR Code" className="welcome-qr-image" />
          </div>

          {/* Center Column: Handwritten Message */}
          <div className="welcome-center-column">
            <img
              src="/welcome-message.svg"
              alt="Welcome Message"
              className="welcome-message-image"
            />
          </div>

          {/* Right Side Column: Balloon Bundle + QR Anchor */}
          <div className="welcome-side-column right-side">
            <div className="balloon-bundle">
              {balloonIndices.map((i) => (
                <img
                  key={`right-${i}`}
                  src="/balloon.svg"
                  alt={`Right Balloon ${i}`}
                  className={`balloon-item balloon-${i}`}
                />
              ))}
            </div>
            <img src={qrCodeUrl} alt="Join QR Code" className="welcome-qr-image" />
          </div>

        </div>
      </div>
    );
  };

  const renderGoodbye = () => {
    return (
      <div className="tv-goodbye-screen animate-scale-up">
        <div className="goodbye-card glass-panel">
          <span className="heart-icon">💖</span>
          <h1>{STRINGS.tv.goodbyeTitle}</h1>
          <p className="goodbye-subtitle">{STRINGS.tv.goodbyeSubtitle}</p>
          
          <div className="goodbye-links-grid">
            <a href="#photos" onClick={(e) => e.preventDefault()} className="goodbye-link-card glass-panel">
              <span className="link-icon">📸</span>
              <span className="link-title">Photo Album</span>
              <span className="link-desc">Share and view party photos</span>
            </a>
            <a href="#playlist" onClick={(e) => e.preventDefault()} className="goodbye-link-card glass-panel">
              <span className="link-icon">🎵</span>
              <span className="link-title">Party Playlist</span>
              <span className="link-desc">Listen back to tonight's tracks</span>
            </a>
          </div>

          <button onClick={handleBackToLeaderboard} className="btn-secondary back-to-leaderboard-btn">
            {STRINGS.tv.backToLeaderboard}
          </button>
        </div>
      </div>
    );
  };

  const renderFinale = () => {
    return (
      <div className="tv-finale-screen animate-fade-in" style={{ justifyContent: 'flex-start', alignItems: 'flex-start', padding: '20px' }}>
        <button 
          onClick={handleBackToLeaderboard} 
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-light, #fff)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '18px',
            padding: '10px',
            opacity: 0.8,
            transition: 'opacity 0.2s',
          }}
          className="back-to-leaderboard-btn"
          aria-label="Back to Leaderboard"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
      </div>
    );
  };

  const renderStandardLeaderboard = () => {
    const balloonIndices = [1, 2, 3, 4, 5];
    return (
      <div className="tv-content">
        {/* Left Side: Balloon Bundle + QR Anchor */}
        <div 
          className={`welcome-side-column left-side ${leftBalloonsReleased ? 'released' : ''}`}
          onClick={handleLeftClick}
          style={{ cursor: 'pointer' }}
        >
          <div className="balloon-bundle">
            {balloonIndices.map((i) => (
              <img
                key={`left-${i}`}
                src="/balloon.svg"
                alt={`Left Balloon ${i}`}
                className={`balloon-item balloon-${i}`}
              />
            ))}
          </div>
          <img src={qrCodeUrl} alt="Join QR Code" className="welcome-qr-image" />
        </div>

        {/* Center: Ranks Board */}
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
                const playerTeam = TEAMS[player.team] || TEAMS.blue;
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

        {/* Right Side: Balloon Bundle + QR Anchor */}
        <div 
          className={`welcome-side-column right-side ${rightBalloonsReleased ? 'released' : ''}`}
          onClick={handleRightClick}
          style={{ cursor: 'pointer' }}
        >
          <div className="balloon-bundle">
            {balloonIndices.map((i) => (
              <img
                key={`right-${i}`}
                src="/balloon.svg"
                alt={`Right Balloon ${i}`}
                className={`balloon-item balloon-${i}`}
              />
            ))}
          </div>
          <img src={qrCodeUrl} alt="Join QR Code" className="welcome-qr-image" />
        </div>
      </div>
    );
  };

  const getHeaderTitle = () => {
    switch (gameState?.activeGame) {
      case 'welcome':
        return STRINGS.tv.welcomeTitle;
      case 'jeopardy':
        return STRINGS.tv.jeopardyMode;
      case 'finale':
        return STRINGS.tv.finaleTitle;
      case 'goodbye':
        return STRINGS.tv.goodbyeTitle;
      default:
        return STRINGS.tv.title;
    }
  };

  const renderActiveScreen = () => {
    switch (gameState?.activeGame) {
      case 'welcome':
        return renderWelcome();
      case 'jeopardy':
        return gameState.jeopardy?.activeClue ? renderActiveClue() : renderJeopardyBoard();
      case 'finale':
        return renderFinale();
      case 'goodbye':
        return renderGoodbye();
      default:
        return renderStandardLeaderboard();
    }
  };

  const isLeaderboardScreen = !gameState?.activeGame;
  const showHeader = gameState?.activeGame !== 'welcome';

  return (
    <div className="tv-page">
      {/* Cosmic background glows */}
      <div className="space-glow glow-1"></div>
      <div className="space-glow glow-2"></div>

      {/* Top Header Panel */}
      {showHeader && (
        <header className="tv-header">
          <div 
            className={`tv-header-left ${isLeaderboardScreen ? 'clickable-header' : ''}`}
            onClick={isLeaderboardScreen ? handleStartJeopardy : undefined}
          >
            <h1>{getHeaderTitle()}</h1>
          </div>
        </header>
      )}

      {renderActiveScreen()}
    </div>
  );
}
