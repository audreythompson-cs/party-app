import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Import views (we will create these next)
import Login from './views/Login';
import Onboarding from './views/Onboarding';
import Dashboard from './views/Dashboard';
import TVDisplay from './views/TVDisplay';
import AdminDashboard from './views/AdminDashboard';

// CSS Imports
import './styles/index.css';
import './styles/themes.css';
import './styles/animations.css';

// Route Guards
function ProtectedRoute({ children }) {
  const { userProfile, loading, isPasscodeVerified } = useAuth();


  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#fff' }}>
        <div className="animate-float">Loading Party app...</div>
      </div>
    );
  }

  if (!isPasscodeVerified) {
    return <Navigate to="/login" replace />;
  }

  if (!userProfile) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

function OnboardingRoute({ children }) {
  const { userProfile, loading, isPasscodeVerified } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#fff' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!isPasscodeVerified) {
    return <Navigate to="/login" replace />;
  }

  if (userProfile) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function LoginRoute({ children }) {
  const { userProfile, loading, isPasscodeVerified } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#fff' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (isPasscodeVerified) {
    if (userProfile) {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

function AppContent() {
  return (
    <Routes>
      {/* Client Mobile Auth Routing */}
      <Route path="/login" element={
        <LoginRoute>
          <Login />
        </LoginRoute>
      } />
      
      <Route path="/onboarding" element={
        <OnboardingRoute>
          <Onboarding />
        </OnboardingRoute>
      } />

      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />

      {/* Shared Screens */}
      <Route path="/tv" element={<TVDisplay />} />
      <Route path="/admin" element={<AdminDashboard />} />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
