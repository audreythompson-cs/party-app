import { STRINGS } from '../constants/strings';
import '../styles/views/HomeTab.css';

export default function HomeTab({ profile }) {
  return (
    <div className="home-tab animate-fade-in full-screen-tab">
      <div className="glass-panel welcome-card animate-scale-up">
        <h2>{STRINGS.welcomeTab.cardTitle}</h2>
        <p className="welcome-message">
          {STRINGS.welcomeTab.cardBody.replace('{name}', profile?.name || 'Guest')}
        </p>
      </div>
    </div>
  );
}
