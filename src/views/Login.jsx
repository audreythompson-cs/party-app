import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { STRINGS } from '../constants/strings';
import { auth } from '../firebase/config';
import { signInAnonymously } from 'firebase/auth';
import { verifyPasscode } from '../firebase/db';
import { BALLOON_IMAGES } from '../constants/teams';
import '../styles/views/Login.css';

export default function Login() {
  const { loginWithPasscode } = useAuth();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!passcode.trim()) return;

    setError('');
    setLoading(true);

    try {
      // 1. Sign in anonymously if not already signed in
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      // 2. Verify passcode locally first so we can control transition delay
      const isValid = await verifyPasscode(passcode);
      if (!isValid) {
        throw new Error('Invalid passcode');
      }

      // Passcode is valid! Start the transition animation
      setIsLoggingIn(true);

      // Wait for 2.5 seconds for the balloon storm animation to cover the screen
      await new Promise(resolve => setTimeout(resolve, 2500));

      // 3. Now trigger the context login to update isPasscodeVerified and trigger redirection
      await loginWithPasscode(passcode);
    } catch (err) {
      console.error(err);
      setError(STRINGS.login.errorInvalid);
      setLoading(false);
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="login-page themed-background">
      {/* Background balloons floating constantly */}
      {backgroundBalloons.map((b) => (
        <img
          key={b.id}
          src={b.imagePath}
          alt="Floating Balloon"
          className="login-balloon"
          style={{
            left: `${b.left}%`,
            width: `${b.size}px`,
            animation: `${b.swayName} ${b.speed}s linear infinite`,
            animationDelay: `${b.delay}s`,
            zIndex: isLoggingIn ? 9999 : 2
          }}
        />
      ))}

      {/* Screen-covering transition balloons once logged in */}
      {isLoggingIn && stormBalloons.map((b) => (
        <img
          key={b.id}
          src={b.imagePath}
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

      <div className="login-card glass-panel animate-scale-up">
        <h1>{STRINGS.login.title}</h1>

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
