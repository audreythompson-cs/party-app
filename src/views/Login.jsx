import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { STRINGS } from '../constants/strings';
import '../styles/views/Login.css';

export default function Login() {
  const { loginWithPasscode } = useAuth();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!passcode.trim()) return;

    setError('');
    setLoading(true);

    try {
      await loginWithPasscode(passcode);
      // Guard will auto-redirect us to /onboarding or /dashboard
    } catch (err) {
      console.error(err);
      setError(STRINGS.login.errorInvalid);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page themed-background">
      <div className="login-content-wrapper animate-scale-up" style={{ width: '100%', maxWidth: '360px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h1 style={{ fontSize: '32px', margin: '0 0 10px 0' }}>{STRINGS.login.title}</h1>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <input
              type="text"
              id="passcode"
              placeholder={STRINGS.login.passcodePlaceholder}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              disabled={loading}
              autoComplete="off"
              autoFocus
            />
          </div>

          {error && <div className="error-message animate-shake">{error}</div>}

          <button 
            type="submit" 
            className="btn-primary login-btn"
            disabled={loading || !passcode.trim()}
          >
            {loading ? STRINGS.login.buttonSubmitEntering : STRINGS.login.buttonSubmit}
          </button>
        </form>
      </div>
    </div>
  );
}
