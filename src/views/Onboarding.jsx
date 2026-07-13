import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { TEAMS } from '../constants/teams';
import { STRINGS } from '../constants/strings';
import { compileRawSvgAvatar } from '../components/AvatarRenderer';
import { isGeminiConfigured, analyzeSelfieWithGemini } from '../services/gemini';
import '../styles/views/Onboarding.css';

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

    setError('');
    setLoading(true);

    try {
      let svgDataUrl = '';
      if (photoCaptured && avatarSvgTemplate) {
        // Replace shirt color placeholder with selected team's color
        const shirtColor = TEAMS[team]?.color || '#06b6d4';
        const finalSvg = avatarSvgTemplate.replace(/__SHIRT_COLOR__/g, shirtColor);
        svgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(finalSvg)}`;
      }
      
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
                      <span>Photo</span>
                    )}
                  </div>
                )}
                {photoLoading && (
                  <div className="avatar-upload-overlay">
                    <div className="spinner"></div>
                    <span className="spinner-text">{STRINGS.onboarding.analyzingSelfie}</span>
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
              disabled={loading || photoLoading || !name.trim()}
            >
              {loading ? STRINGS.onboarding.buttonSubmitEntering : STRINGS.onboarding.buttonSubmit}
            </button>
          </form>
        </div>
      </div>


    </div>
  );
}
