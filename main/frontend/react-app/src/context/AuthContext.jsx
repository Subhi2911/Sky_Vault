import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, signOut as firebaseSignOut } from "../firebase";

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Check session expiry
        const loginTime = parseInt(localStorage.getItem('loginTime') || '0', 10);
        if (loginTime && Date.now() - loginTime > SESSION_DURATION) {
          // Session expired — sign out
          await firebaseSignOut(auth);
          localStorage.clear();
          setUser(null);
          setLoading(false);
          return;
        }
      }
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function signOut() {
    await firebaseSignOut(auth);
    localStorage.removeItem("firebaseUid");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("isLoggedIn");
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
