import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { STRINGS } from '../constants/strings';
import { onLeaderboardChange } from '../firebase/db';
import '../styles/views/Onboarding.css';

export default function Onboarding() {
  const { registerProfile, claimProfile, teams } = useAuth();
  const [name, setName] = useState('');
  const [team, setTeam] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Predefined Guests State
  const [registeredPlayers, setRegisteredPlayers] = useState([]);
  const [selectedGuestName, setSelectedGuestName] = useState('');
  const [selectedGuestId, setSelectedGuestId] = useState('');
  const [customName, setCustomName] = useState('');
  const [isCustomName, setIsCustomName] = useState(false);

  // Set default team from loaded dynamic teams list
  useEffect(() => {
    if (teams && teams.length > 0 && !team) {
      setTeam(teams[0].id);
    }
  }, [teams, team]);

  // Subscribe to registered users (both real players and placeholder/predefined ones) on mount
  useEffect(() => {
    const unsubscribe = onLeaderboardChange((data) => {
      setRegisteredPlayers(data);
    });
    return () => unsubscribe();
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
      if (isCustomName) {
        // Create new user profile normally
        await registerProfile(finalName, team, '', '');
      } else {
        // Claim the existing placeholder player record
        await claimProfile(selectedGuestId, selectedGuestName, team);
      }
      // Routing guards in App.jsx will automatically route us to /dashboard
    } catch (err) {
      console.error(err);
      setError(err.message || STRINGS.onboarding.errorSubmitFailed);
      setLoading(false);
    }
  };

  const finalNameValue = isCustomName ? customName.trim() : selectedGuestName.trim();

  // Filter placeholder players assigned to this team
  const availablePlaceholders = (registeredPlayers || []).filter(
    p => p.isPlaceholder && p.team === team
  );

  return (
    <div className={`onboarding-page themed-background theme-${team}`}>
      <div className="onboarding-container app-container animate-fade-in">
        <div className="onboarding-card glass-panel animate-scale-up">
          <h2>{STRINGS.onboarding.title}</h2>
          <p className="subtitle">{STRINGS.onboarding.subtitle}</p>

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
                      <span className="team-indicator"></span>
                      <span className="team-name">{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Name Selector (Pre-defined guest names for selected team) */}
            <div className="input-group">
              <label htmlFor="guest-select">{STRINGS.onboarding.nameSelectLabel}</label>
              <select
                id="guest-select"
                value={isCustomName ? 'custom' : selectedGuestName}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'custom') {
                    setIsCustomName(true);
                    setSelectedGuestName('');
                    setSelectedGuestId('');
                    setName('');
                  } else {
                    const match = availablePlaceholders.find(p => p.name === val);
                    setIsCustomName(false);
                    setSelectedGuestName(val);
                    setSelectedGuestId(match ? match.uid : '');
                    setName(val);
                  }
                }}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid var(--border-glass)',
                  color: 'var(--text-bright)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              >
                <option value="">{STRINGS.onboarding.nameSelectPlaceholder}</option>
                {availablePlaceholders.map((g) => (
                  <option key={g.uid} value={g.name}>
                    {g.name}
                  </option>
                ))}
                <option value="custom">{STRINGS.onboarding.nameSelectCustom}</option>
              </select>
            </div>

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
