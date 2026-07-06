import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { TEAMS } from '../constants/teams';
import { STRINGS } from '../constants/strings';
import { compileRawSvgAvatar } from '../components/AvatarRenderer';
import { isGeminiConfigured, analyzeSelfieWithGemini } from '../services/gemini';

export default function Onboarding() {
  const { registerProfile } = useAuth();
  const [name, setName] = useState('');
  const [team, setTeam] = useState('teal');
  
  // Raw SVG template containing "__SHIRT_COLOR__" placeholder
  const [avatarSvgTemplate, setAvatarSvgTemplate] = useState('');
  
  const [photoCaptured, setPhotoCaptured] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // Handle camera capture or photo upload
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');
    setPhotoLoading(true);
    
    try {
      if (!isGeminiConfigured()) {
        throw new Error('Gemini API is not configured. Please add the VITE_GEMINI_API_KEY environment variable.');
      }

      console.log('Analyzing selfie with Gemini Vision API...');
      const features = await analyzeSelfieWithGemini(file);
      console.log('Gemini features classified successfully:', features);

      // Compile raw template SVG string using pre-drawn vector assets
      const rawSvg = compileRawSvgAvatar(
        features.skinTone,
        features.hairColor,
        '__SHIRT_COLOR__',
        name,
        features.hairStyle,
        features.facialHair,
        features.glasses,
        features.eyeStyle,
        features.mouthStyle
      );

      setAvatarSvgTemplate(rawSvg);
      setPhotoCaptured(true);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to analyze photo. Please try again.');
    } finally {
      setPhotoLoading(false);
    }
  };

  const triggerCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(STRINGS.onboarding.errorNameRequired);
      return;
    }
    if (!photoCaptured) {
      setError(STRINGS.onboarding.errorPhotoRequired);
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Replace shirt color placeholder with selected team's color
      const shirtColor = TEAMS[team]?.color || '#06b6d4';
      const finalSvg = avatarSvgTemplate.replace(/__SHIRT_COLOR__/g, shirtColor);
      const svgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(finalSvg)}`;
      
      // Save profile in Firestore (storing SVG directly in user profile doc)
      await registerProfile(name, team, svgDataUrl);
      // Routing guards in App.jsx will automatically route us to /dashboard
    } catch (err) {
      console.error(err);
      setError(err.message || STRINGS.onboarding.errorSubmitFailed);
      setLoading(false);
    }
  };

  const activeTeamColor = TEAMS[team]?.color || '#06b6d4';

  return (
    <div className={`onboarding-page themed-background theme-${team}`}>
      <div className="onboarding-container app-container animate-fade-in">
        <div className="onboarding-card glass-panel animate-scale-up">
          <h2>{STRINGS.onboarding.title}</h2>
          <p className="subtitle">{STRINGS.onboarding.subtitle}</p>

          <form onSubmit={handleSubmit} className="onboarding-form">
            
            {/* Selfie / Avatar Generation Section */}
            <div className="avatar-section">
              <div className="avatar-preview-container animate-glow">
                {photoCaptured ? (
                  <div className="avatar-svg-container animate-scale-up">
                    <img 
                      src={`data:image/svg+xml;utf8,${encodeURIComponent(avatarSvgTemplate.replace(/__SHIRT_COLOR__/g, activeTeamColor))}`} 
                      alt="Avatar Preview" 
                      style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }}
                    />
                  </div>
                ) : (
                  <div className="avatar-placeholder">
                    {photoLoading ? (
                      <div className="spinner"></div>
                    ) : (
                      <span>📷</span>
                    )}
                  </div>
                )}
                {photoLoading && (
                  <div className="avatar-upload-overlay">
                    <div className="spinner"></div>
                    <span className="spinner-text">Analyzing Selfie...</span>
                  </div>
                )}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                capture="user"
                style={{ display: 'none' }}
                disabled={loading || photoLoading}
              />

              <button
                type="button"
                onClick={triggerCamera}
                className="btn-secondary camera-btn"
                disabled={loading || photoLoading}
              >
                {photoCaptured ? STRINGS.onboarding.photoRetake : STRINGS.onboarding.photoButton}
              </button>
            </div>

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
                disabled={loading || photoLoading}
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
                      disabled={loading || photoLoading}
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
              disabled={loading || photoLoading || !name.trim() || !photoCaptured}
            >
              {loading ? 'Entering Party...' : STRINGS.onboarding.buttonSubmit}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        .onboarding-page {
          min-height: 100vh;
          min-height: 100svh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px 0;
        }

        .onboarding-card {
          width: 100%;
          border-radius: 24px;
          padding: 30px 24px;
        }

        .onboarding-card h2 {
          text-align: center;
          font-size: 24px;
          margin-bottom: 8px;
        }

        .subtitle {
          text-align: center;
          font-size: 14px;
          color: var(--text-muted);
          line-height: 1.5;
          margin-bottom: 24px;
        }

        .onboarding-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Avatar Section styling */
        .avatar-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin-bottom: 10px;
        }

        .avatar-preview-container {
          position: relative;
          width: 130px;
          height: 130px;
          border-radius: 50%;
          border: 3px solid var(--accent);
          background: rgba(255, 255, 255, 0.03);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 15px var(--accent-glow);
          transition: all 0.3s ease;
        }

        .avatar-svg-container {
          width: 100%;
          height: 100%;
        }

        .avatar-placeholder {
          font-size: 40px;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .avatar-upload-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .spinner {
          width: 28px;
          height: 28px;
          border: 3px solid rgba(255, 255, 255, 0.15);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .spinner-text {
          font-size: 11px;
          color: var(--text-bright);
          font-weight: 600;
          letter-spacing: 0.02em;
        }

        .camera-btn {
          padding: 8px 18px;
          font-size: 13px;
          border-radius: 20px;
          font-weight: 600;
        }

        /* Inputs */
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .input-group label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-bright);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Teams grid selection */
        .teams-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .team-option {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-md);
          padding: 14px 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--text-muted);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          text-align: left;
        }

        .team-option:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .team-option.selected {
          background: var(--team-bg);
          border-color: var(--team-color);
          color: var(--text-bright);
          box-shadow: 0 0 10px var(--team-glow);
        }

        .team-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background-color: var(--team-color);
          box-shadow: 0 0 8px var(--team-color);
          display: inline-block;
          flex-shrink: 0;
        }

        .team-name {
          font-size: 14px;
          font-weight: 600;
        }

        .error-message {
          color: #ff6f61;
          font-size: 13px;
          font-weight: 500;
          background: rgba(255, 111, 97, 0.1);
          border: 1px solid rgba(255, 111, 97, 0.2);
          padding: 12px;
          border-radius: var(--radius-md);
          text-align: center;
        }

        .join-btn {
          width: 100%;
          margin-top: 10px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
