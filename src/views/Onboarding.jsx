import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { STRINGS } from '../constants/strings';
import { onLeaderboardChange } from '../firebase/db';
import { TEAMS, BALLOON_IMAGES } from '../constants/teams';
import '../styles/views/Onboarding.css';

export default function Onboarding() {
  const { registerProfile, claimProfile, teams } = useAuth();
  const [name, setName] = useState('');
  const [team, setTeam] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Predefined Guests State
  const [registeredPlayers, setRegisteredPlayers] = useState([]);
  const [selectedGuestName, setSelectedGuestName] = useState('');
  const [selectedGuestId, setSelectedGuestId] = useState('');
  const [customName, setCustomName] = useState('');
  const [isCustomName, setIsCustomName] = useState(false);

  // Subscribe to registered users (both real players and placeholder/predefined ones) on mount
  useEffect(() => {
    const unsubscribe = onLeaderboardChange((data) => {
      setRegisteredPlayers(data);
    });
    return () => unsubscribe();
  }, []);

  // Background floating balloons (idle state)
  const backgroundBalloons = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: Math.random() * 90 + 5,
      delay: Math.random() * 8,
      speed: Math.random() * 6 + 7,
      size: Math.random() * 40 + 60,
      swayName: ['login-float-left', 'login-float-right', 'login-float-straight'][i % 3],
      imagePath: BALLOON_IMAGES[i % BALLOON_IMAGES.length]
    }));
  }, []);

  // Screen-covering transition balloons (active logging in state)
  const stormBalloons = useMemo(() => {
    return Array.from({ length: 45 }, (_, i) => ({
      id: `storm-${i}`,
      left: Math.random() * 96 - 2,
      delay: Math.random() * 1.2,
      speed: Math.random() * 1.2 + 1.6,
      size: Math.random() * 60 + 80,
      swayName: ['login-float-left', 'login-float-right', 'login-float-straight'][i % 3],
      imagePath: BALLOON_IMAGES[i % BALLOON_IMAGES.length]
    }));
  }, []);

  // When the team changes, reset selected options so we don't bleed inputs
  const handleTeamChange = (newTeam) => {
    setTeam(newTeam);
    setSelectedGuestName('');
    setSelectedGuestId('');
    setCustomName('');
    setIsCustomName(false);
    setName('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const finalName = isCustomName ? customName.trim() : selectedGuestName.trim();
    if (!finalName) {
      setError(STRINGS.onboarding.errorNameRequired);
      return;
    }

    setError('');
    setLoading(true);

    try {
      // 1. Show the transition balloons first (so they cover the screen)
      setIsTransitioning(true);

      // Wait 2.5s for the balloons to cover the screen
      await new Promise(resolve => setTimeout(resolve, 2500));

      // 2. Now write the profile to Firestore (which immediately triggers the redirect)
      if (isCustomName) {
        await registerProfile(finalName, team, '', '');
      } else {
        await claimProfile(selectedGuestId, selectedGuestName, team);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || STRINGS.onboarding.errorSubmitFailed);
      setLoading(false);
      setIsTransitioning(false);
    }
  };

  const finalNameValue = isCustomName ? customName.trim() : selectedGuestName.trim();

  // Filter placeholder players assigned to this team
  const availablePlaceholders = (registeredPlayers || []).filter(
    p => p.isPlaceholder && p.team === team
  );

  const selectedTeamObj = teams.find(t => t.id === team);

  return (
    <div 
      className={`onboarding-page theme-${team}`}
      style={selectedTeamObj ? { backgroundColor: selectedTeamObj.color, background: selectedTeamObj.color } : {}}
    >
      {/* Background balloons floating constantly */}
      {backgroundBalloons.map((b) => (
        <img
          key={b.id}
          src={team && TEAMS[team] ? TEAMS[team].balloon : b.imagePath}
          alt="Floating Balloon"
          className="login-balloon"
          style={{
            left: `${b.left}%`,
            width: `${b.size}px`,
            animation: `${b.swayName} ${b.speed}s linear infinite`,
            animationDelay: `${b.delay}s`,
            zIndex: isTransitioning ? 9999 : 2
          }}
        />
      ))}

      {/* Screen-covering transition balloons once onboarding is complete */}
      {isTransitioning && stormBalloons.map((b) => (
        <img
          key={b.id}
          src={team && TEAMS[team] ? TEAMS[team].balloon : b.imagePath}
          alt="Storm Balloon"
          className="storm-balloon"
          style={{
            left: `${b.left}%`,
            width: `${b.size}px`,
            animation: `${b.swayName} ${b.speed}s ease-in forwards`,
            animationDelay: `${b.delay}s`
          }}
        />
      ))}

      <div className="onboarding-container app-container animate-fade-in">
        <div className="onboarding-card glass-panel animate-scale-up">
          <h2>{STRINGS.onboarding.title}</h2>

          <form onSubmit={handleSubmit} className="onboarding-form">
            
            {/* Team / Table Selector (Must select table first) */}
            <div className="input-group">
              <label>{STRINGS.onboarding.teamLabel}</label>
              <div className="teams-grid">
                {teams.map((t) => {
                  const isSelected = team === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleTeamChange(t.id)}
                      className={`team-option ${isSelected ? 'selected' : ''}`}
                      style={{
                        '--team-color': t.color,
                        '--team-glow': t.glow,
                        '--team-bg': t.accentBg,
                      }}
                      disabled={loading}
                    >
                      <span className="team-name">{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Name Selector (Pre-defined guest names for selected team) */}
            {team && (
              <div className="input-group animate-fade-in">
                <label>{STRINGS.onboarding.nameSelectLabel}</label>
                <div 
                  className="players-grid"
                  style={selectedTeamObj ? {
                    '--team-color': selectedTeamObj.color,
                    '--team-glow': selectedTeamObj.glow,
                  } : {}}
                >
                  {availablePlaceholders.map((g) => {
                    const isSelected = selectedGuestName === g.name && !isCustomName;
                    return (
                      <button
                        key={g.uid}
                        type="button"
                        onClick={() => {
                          setIsCustomName(false);
                          setSelectedGuestName(g.name);
                          setSelectedGuestId(g.uid);
                          setName(g.name);
                        }}
                        className={`player-option ${isSelected ? 'selected' : ''}`}
                        disabled={loading}
                      >
                        {g.name}
                      </button>
                    );
                  })}
                  
                  {/* I'm not listed option */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomName(true);
                      setSelectedGuestName('');
                      setSelectedGuestId('');
                      setName('');
                    }}
                    className={`player-option not-listed-option ${isCustomName ? 'selected' : ''}`}
                    disabled={loading}
                  >
                    I'm not listed
                  </button>
                </div>
              </div>
            )}

            {/* Custom Name Write-in (Hidden unless user selects custom) */}
            {isCustomName && (
              <div className="input-group animate-fade-in">
                <label htmlFor="custom-name">{STRINGS.onboarding.customNameLabel}</label>
                <input
                  type="text"
                  id="custom-name"
                  maxLength="20"
                  placeholder={STRINGS.onboarding.namePlaceholder}
                  value={customName}
                  onChange={(e) => {
                    setCustomName(e.target.value);
                    setName(e.target.value);
                  }}
                  disabled={loading}
                  autoComplete="off"
                />
              </div>
            )}

            {error && <div className="error-message">{error}</div>}

            <button
              type="submit"
              className="btn-primary join-btn animate-glow"
              disabled={loading || !finalNameValue}
            >
              {loading ? STRINGS.onboarding.buttonSubmitEntering : STRINGS.onboarding.buttonSubmit}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
