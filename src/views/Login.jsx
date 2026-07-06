import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { STRINGS } from '../constants/strings';

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
    <div className="login-page themed-background theme-teal">
      <div className="login-card glass-panel animate-scale-up">
        <div className="logo-area">
          <div className="logo-glow">🎓</div>
        </div>
        
        <h1>{STRINGS.appName}</h1>
        <p className="subtitle">{STRINGS.login.subtitle}</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="passcode">{STRINGS.login.passcodeLabel}</label>
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
            {loading ? 'Entering...' : STRINGS.login.buttonSubmit}
          </button>
        </form>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          min-height: 100svh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: radial-gradient(circle at center, #0f0a24 0%, #05030a 100%);
        }

        .login-card {
          width: 100%;
          max-width: 400px;
          text-align: center;
          padding: 40px 30px;
          border-radius: 24px;
        }

        .logo-area {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }

        .logo-glow {
          font-size: 48px;
          width: 90px;
          height: 90px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 30px var(--accent-glow);
          animation: float 5s ease-in-out infinite;
        }

        h1 {
          font-size: 28px;
          margin-bottom: 12px;
          background: linear-gradient(135deg, #ffffff 0%, var(--accent) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .subtitle {
          font-size: 14px;
          color: var(--text-muted);
          line-height: 1.6;
          margin-bottom: 30px;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
          text-align: left;
        }

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

        .error-message {
          color: #ff6f61;
          font-size: 13px;
          font-weight: 500;
          background: rgba(255, 111, 97, 0.1);
          border: 1px solid rgba(255, 111, 97, 0.25);
          padding: 10px 14px;
          border-radius: 10px;
          text-align: center;
        }

        .login-btn {
          width: 100%;
          margin-top: 10px;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(5deg); }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}
