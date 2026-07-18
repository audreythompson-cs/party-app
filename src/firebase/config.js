import { initializeApp } from 'firebase/app';
import { initializeAuth, browserSessionPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBaRgIy_1J4kgeN64URmcQvR6SxxC3v75s",
  authDomain: "grad-party-2026-85add.firebaseapp.com",
  projectId: "grad-party-2026-85add",
  storageBucket: "grad-party-2026-85add.firebasestorage.app",
  messagingSenderId: "922740580312",
  appId: "1:922740580312:web:717a068646a1bc28a5dcad"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
// Keep authentication isolated to each browser tab. This allows a player
// dashboard and the admin/TV views to use different accounts simultaneously.
export const auth = initializeAuth(app, {
  persistence: browserSessionPersistence
});
export const db = getFirestore(app);
export default app;
