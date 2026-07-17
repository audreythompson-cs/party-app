import '../styles/components/BottomNav.css';

export default function BottomNav({ activeTab, setActiveTab, position = 'bottom' }) {
  const tabs = [
    {
      id: 'home',
      label: 'Home',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )
    },
    {
      id: 'jeopardy',
      label: 'Jeopardy',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
          <rect x="2" y="2" width="20" height="20" rx="2" ry="2" />
          <path d="M6 12h12M12 6v12" />
        </svg>
      )
    },
    {
      id: 'goals',
      label: 'Side Quests',
      icon: (
        <img src="/sidequests.png" alt="" className="nav-icon side-quests-icon" />
      )
    },
    {
      id: 'donate',
      label: 'Send',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      )
    }
  ];

  return (
    <nav className={`dashboard-nav dashboard-nav-${position}`} aria-label="Dashboard sections">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`nav-btn ${isActive ? 'active' : ''}`}
            aria-label={tab.label}
          >
            <div className="nav-icon-container">
              {tab.icon}
            </div>
          </button>
        );
      })}


    </nav>
  );
}
