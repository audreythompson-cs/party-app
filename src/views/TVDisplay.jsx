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
      activeGame: 'welcome'
    });
  };

  const handleStartFinale = async () => {
    await updateGameState({
      activeGame: 'finale'
    });
  };

  const handleStartGoodbye = async () => {
    await updateGameState({
      activeGame: 'goodbye'
    });
  };

  const handleBackToLeaderboard = async () => {
    await updateGameState({
      activeGame: null
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
              onChange={(e) => setDeductPoints(e.target.checked)} 
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

  const renderWelcome = () => {
    return (
      <div className="tv-welcome-screen animate-scale-up">
        <div className="welcome-card glass-panel">
          <span className="welcome-emoji">👋</span>
          <h1>{STRINGS.tv.welcomeTitle}</h1>
          <p className="welcome-subtitle">{STRINGS.tv.welcomeSubtitle}</p>
          
          <div className="qr-container welcome-qr">
            <img src={qrCodeUrl} alt="Join QR Code" className="qr-image" />
            <div className="qr-border-corner top-left"></div>
            <div className="qr-border-corner top-right"></div>
            <div className="qr-border-corner bottom-left"></div>
            <div className="qr-border-corner bottom-right"></div>
          </div>
          
          <div className="join-url-pill">
            <span className="join-url-label">Visit:</span>
            <span className="join-url-text">{joinUrl.replace(/(^\w+:|^)\/\//, '')}</span>
          </div>

          <button onClick={handleBackToLeaderboard} className="btn-secondary back-to-leaderboard-btn">
            {STRINGS.tv.backToLeaderboard}
          </button>
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
    const topThree = leaderboard.slice(0, 3);
    const totalPlayers = leaderboard.length;
    const totalPoints = leaderboard.reduce((sum, p) => sum + (p.points ?? 0), 0);
    const avgPoints = totalPlayers > 0 ? Math.round(totalPoints / totalPlayers) : 0;
    
    // Group points by team
    const teamScores = {};
    leaderboard.forEach(p => {
      const t = p.team || 'teal';
      teamScores[t] = (teamScores[t] || 0) + (p.points ?? 0);
    });
    
    let topTeamKey = 'teal';
    let maxTeamScore = -1;
    Object.keys(teamScores).forEach(t => {
      if (teamScores[t] > maxTeamScore) {
        maxTeamScore = teamScores[t];
        topTeamKey = t;
      }
    });
    const topTeam = TEAMS[topTeamKey] || TEAMS.teal;

    // Podium layout: 2nd, 1st, 3rd visually
    const podiumPlayers = [];
    if (topThree[1]) podiumPlayers.push({ ...topThree[1], rank: 2, label: '🥈 2nd' });
    if (topThree[0]) podiumPlayers.push({ ...topThree[0], rank: 1, label: '👑 1st' });
    if (topThree[2]) podiumPlayers.push({ ...topThree[2], rank: 3, label: '🥉 3rd' });

    return (
      <div className="tv-finale-screen animate-fade-in">
        {/* Podium Area */}
        <div className="podium-container">
          {podiumPlayers.length === 0 ? (
            <p className="no-players-msg">No players registered yet.</p>
          ) : (
            <div className="podium-wrapper">
              {podiumPlayers.map((p) => {
                const team = TEAMS[p.team] || TEAMS.teal;
                return (
                  <div key={p.uid} className={`podium-column rank-${p.rank}`} style={{ '--team-color': team.color }}>
                    <div className="podium-player-card glass-panel">
                      {p.rank === 1 && <div className="podium-crown">👑</div>}
                      <span className="podium-player-name">{p.name}</span>
                      <span className="podium-player-points">{p.points ?? 0} pts</span>
                      <span className="podium-player-team" style={{ borderColor: team.color, color: team.color }}>
                        {team.name}
                      </span>
                    </div>
                    <div className="podium-pedestal">
                      <span className="podium-rank-label">{p.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stats Section */}
        <div className="finale-stats-section">
          <h2>{STRINGS.tv.finaleStatsTitle}</h2>
          <div className="stats-grid">
            <div className="stat-card glass-panel">
              <span className="stat-value">{totalPoints}</span>
              <span className="stat-label">{STRINGS.tv.finaleTotalPoints}</span>
            </div>
            <div className="stat-card glass-panel">
              <span className="stat-value">{avgPoints}</span>
              <span className="stat-label">{STRINGS.tv.finaleAvgPoints}</span>
            </div>
            <div className="stat-card glass-panel">
              <span className="stat-value">{totalPlayers}</span>
              <span className="stat-label">{STRINGS.tv.finaleTotalPlayers}</span>
            </div>
            <div className="stat-card glass-panel" style={{ '--accent-color': topTeam.color }}>
              <span className="stat-value team-name-val" style={{ color: topTeam.color }}>{topTeam.name}</span>
              <span className="stat-label">{STRINGS.tv.finaleTopTeam} ({maxTeamScore} pts)</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="finale-actions">
          <button onClick={handleStartGoodbye} className="btn-primary goodbye-wrapup-btn">
            {STRINGS.tv.goodbyeWrapUpBtn}
          </button>
          <button onClick={handleBackToLeaderboard} className="btn-secondary">
            {STRINGS.tv.backToLeaderboard}
          </button>
        </div>
      </div>
    );
  };

  const renderStandardLeaderboard = () => {
    return (
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
          
          <div className="join-url-pill" style={{ marginBottom: '10px' }}>
            <span className="join-url-label">Visit:</span>
            <span className="join-url-text">{joinUrl.replace(/(^\w+:|^)\/\//, '')}</span>
          </div>

          <div className="tv-navigation-buttons">
            <button onClick={handleStartWelcome} className="btn-secondary tv-nav-btn">
              {STRINGS.tv.welcomeBtn}
            </button>
            <button onClick={handleStartJeopardy} className="btn-primary tv-nav-btn">
              {STRINGS.tv.jeopardyBtn}
            </button>
            <button onClick={handleStartFinale} className="btn-secondary tv-nav-btn">
              {STRINGS.tv.finaleBtn}
            </button>
          </div>
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

  return (
    <div className="tv-page">
      {/* Cosmic background glows */}
      <div className="space-glow glow-1"></div>
      <div className="space-glow glow-2"></div>

      {/* Top Header Panel */}
      <header className="tv-header">
        <div className="tv-header-left">
          <h1>{getHeaderTitle()}</h1>
        </div>
        <div className="tv-header-right">
          <span className="tv-clock">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </header>

      {renderActiveScreen()}
    </div>
  );
}
