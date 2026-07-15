/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase/config';
import { signInAnonymously, signOut, onAuthStateChanged } from 'firebase/auth';
import { 
  verifyPasscode, 
  createUserProfile, 
  onUserProfileChange, 
  onTeamsChange, 
  claimPlaceholderPlayer 
} from '../firebase/db';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPasscodeVerified, setIsPasscodeVerified] = useState(() => {
    return sessionStorage.getItem('passcode_verified') === 'true';
  });

  // Dynamic Teams state
  const [teams, setTeams] = useState([]);
  const [teamsMap, setTeamsMap] = useState({});

  // Listen to Auth State changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Sign-in successful, listen to profile changes in Firestore
        const unsubscribeProfile = onUserProfileChange(user.uid, (profile) => {
          setUserProfile(profile);
          setLoading(false);
        });
        
        return () => {
          unsubscribeProfile();
        };
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Listen to dynamic teams in Firestore
  useEffect(() => {
    const unsubscribeTeams = onTeamsChange((data) => {
      setTeams(data);
      const mapping = (data || []).reduce((acc, t) => {
        acc[t.id] = t;
        return acc;
      }, {});
      setTeamsMap(mapping);
    });

    return () => unsubscribeTeams();
  }, []);

  // Passcode verification
  const loginWithPasscode = async (passcode) => {
    try {
      // 1. Sign in anonymously first so Firestore rules allow reading config doc
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      
      // 2. Now check the passcode
      const isValid = await verifyPasscode(passcode);
      
      if (isValid) {
        sessionStorage.setItem('passcode_verified', 'true');
        setIsPasscodeVerified(true);
        return true;
      } else {
        // Sign out if passcode is incorrect
        await signOut(auth);
        sessionStorage.removeItem('passcode_verified');
        setIsPasscodeVerified(false);
        throw new Error('Invalid passcode');
      }
    } catch (err) {
      // Clean up session if anything failed
      await signOut(auth);
      sessionStorage.removeItem('passcode_verified');
      setIsPasscodeVerified(false);
      throw new Error(err.message || 'Invalid passcode', { cause: err });
    }
  };

  // Complete registration by writing profile to Firestore (custom write-in name)
  const registerProfile = async (name, team, photoUrl, sideQuest = '') => {
    if (!currentUser) {
      throw new Error('No authenticated user session found.');
    }
    const profile = await createUserProfile(currentUser.uid, name, team, photoUrl, sideQuest);
    setUserProfile(profile);
    return profile;
  };

  // Claim a pre-created placeholder player
  const claimProfile = async (placeholderId, name, team) => {
    if (!currentUser) {
      throw new Error('No authenticated user session found.');
    }
    await claimPlaceholderPlayer(currentUser, placeholderId, name, team);
  };

  const logout = async () => {
    setLoading(true);
    sessionStorage.removeItem('passcode_verified');
    setIsPasscodeVerified(false);
    await signOut(auth);
    setUserProfile(null);
    setCurrentUser(null);
    setLoading(false);
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    isPasscodeVerified,
    loginWithPasscode,
    registerProfile,
    claimProfile,
    logout,
    teams,
    teamsMap
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
