import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { TEAMS } from '../constants/teams';
import { STRINGS } from '../constants/strings';
import '../styles/views/Onboarding.css';

export default function Onboarding() {
  const { registerProfile } = useAuth();
  const [name, setName] = useState('');
  const [team, setTeam] = useState('blue');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(STRINGS.onboarding.errorNameRequired);
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Save profile in Firestore (storing empty photoUrl/svgDataUrl)
      await registerProfile(name, team, '');
      // Routing guards in App.jsx will automatically route us to /dashboard
    } catch (err) {
      console.error(err);
      setError(err.message || STRINGS.onboarding.errorSubmitFailed);
      setLoading(false);
    }
  };

  return (
    <div className={`onboarding-page themed-background theme-${team}`}>
      <div className="onboarding-container app-container animate-fade-in">
        <div className="onboarding-card glass-panel animate-scale-up">
          <h2>{STRINGS.onboarding.title}</h2>
          <p className="subtitle">{STRINGS.onboarding.subtitle}</p>

          <form onSubmit={handleSubmit} className="onboarding-form">
            
            {/* Name Input */}
            <div className="input-group">
              <label htmlFor="name">{STRINGS.onboarding.nameLabel}</label>
              <input
                type="text"
                id="name"
                maxLength="20"
                placeholder={STRINGS.onboarding.namePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                autoComplete="off"
              />
            </div>

            {/* Team / Table Selector */}
            <div className="input-group">
              <label>{STRINGS.onboarding.teamLabel}</label>
              <div className="teams-grid">
                {Object.values(TEAMS).map((t) => {
                  const isSelected = team === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTeam(t.id)}
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

            {error && <div className="error-message">{error}</div>}

            <button
              type="submit"
              className="btn-primary join-btn animate-glow"
              disabled={loading || !name.trim()}
            >
              {loading ? STRINGS.onboarding.buttonSubmitEntering : STRINGS.onboarding.buttonSubmit}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
