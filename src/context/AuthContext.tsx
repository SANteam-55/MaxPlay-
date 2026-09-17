import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updateProfile as updateFirebaseAuthProfile,
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { UserProfile } from '../types';
import { STORAGE_KEYS } from '../utils/constants';
import { checkLoginRateLimit, recordFailedAttempt, resetLoginAttempts } from '../utils/rateLimiter';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (name: string, email: string, pass: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_MOCK_USER: UserProfile = {
  uid: 'user-262387399',
  email: 'user@maxplay.app',
  displayName: 'Drawing shorts',
  gender: 'Male',
  age: 15,
  idNumber: '262387399',
  isPremium: true,
  points: 120,
  bio: 'MovieBox lover & anime streamer',
  status: 'active',
  isBlocked: false,
  role: 'user',
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Cached user parse error:', e);
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync Firebase Auth user profile with Firestore users/{uid}
  const syncFirestoreUserProfile = async (fbUser: FirebaseUser): Promise<UserProfile> => {
    try {
      const userRef = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        const profile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email || data.email || '',
          displayName: data.displayName || data.name || fbUser.displayName || fbUser.email?.split('@')[0] || 'MaxPlay User',
          photoURL: fbUser.photoURL || data.photoURL || data.avatar || '',
          gender: data.gender || 'Male',
          age: data.age || 20,
          idNumber: fbUser.uid.substring(0, 8),
          isPremium: data.isPremium || false,
          points: data.points || 50,
          bio: data.bio || 'MaxPlay enthusiast',
          status: data.status || (data.isBlocked ? 'blocked' : 'active'),
          isBlocked: data.isBlocked || data.status === 'blocked' || data.status === 'suspended',
          blockReason: data.blockReason || '',
          blockMessage: data.blockMessage || '',
          blockedAt: data.blockedAt || '',
          role: data.role || (data.isAdmin ? 'admin' : 'user'),
          createdAt: data.createdAt || '',
          lastLoginAt: new Date().toISOString()
        };
        // Update last login timestamp
        await setDoc(userRef, {
          lastLoginAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: profile.status,
          role: profile.role
        }, { merge: true });
        return profile;
      } else {
        const newProfileData = {
          id: fbUser.uid,
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'MaxPlay User',
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'MaxPlay User',
          photoURL: fbUser.photoURL || '',
          avatar: fbUser.photoURL || '',
          gender: 'Male',
          age: 20,
          bio: 'MaxPlay Streamer',
          isPremium: false,
          points: 50,
          role: 'user',
          status: 'active',
          isBlocked: false,
          blockReason: '',
          blockMessage: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        };
        await setDoc(userRef, newProfileData, { merge: true });
        return {
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: newProfileData.displayName,
          photoURL: fbUser.photoURL || '',
          gender: 'Male',
          age: 20,
          idNumber: fbUser.uid.substring(0, 8),
          isPremium: false,
          points: 50,
          bio: newProfileData.bio,
          status: 'active',
          isBlocked: false,
          role: 'user',
          createdAt: newProfileData.createdAt
        };
      }
    } catch (e) {
      console.warn('Firestore user profile sync error:', e);
      return {
        uid: fbUser.uid,
        email: fbUser.email || 'user@maxplay.app',
        displayName: fbUser.displayName || 'MaxPlay User',
        photoURL: fbUser.photoURL || '',
        gender: 'Male',
        age: 20,
        idNumber: fbUser.uid.substring(0, 8),
        isPremium: true,
        points: 50,
        bio: 'MaxPlay Streamer',
        status: 'active',
        isBlocked: false,
        role: 'user'
      };
    }
  };

  useEffect(() => {
    // Process redirect result if redirected back from Google Sign-In
    const handleRedirectResult = async () => {
      try {
        const res = await getRedirectResult(auth);
        if (res && res.user) {
          console.log('Successfully completed Google Redirect Sign-In:', res.user.email);
          const profile = await syncFirestoreUserProfile(res.user);
          setUser(profile);
          localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(profile));
        }
      } catch (err) {
        console.warn('Google Redirect Result processing error:', err);
      }
    };
    handleRedirectResult();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const profile = await syncFirestoreUserProfile(fbUser);
        setUser(profile);
        localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(profile));
      } else {
        const savedUser = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
        if (savedUser) {
          try {
            const parsed = JSON.parse(savedUser);
            setUser(parsed);
            // Also ensure synced in firestore if valid uid
            if (parsed.uid) {
              setDoc(doc(db, 'users', parsed.uid), {
                id: parsed.uid,
                uid: parsed.uid,
                displayName: parsed.displayName,
                name: parsed.displayName,
                email: parsed.email,
                photoURL: parsed.photoURL || '',
                avatar: parsed.photoURL || '',
                gender: parsed.gender || 'Male',
                age: parsed.age || 20,
                bio: parsed.bio || '',
                isPremium: !!parsed.isPremium,
                points: parsed.points || 100,
                status: parsed.status || 'active',
                role: parsed.role || 'user',
                lastLoginAt: new Date().toISOString()
              }, { merge: true }).catch(() => {});
            }
          } catch (e) {
            setUser(null);
            localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
          }
        } else {
          // Unauthenticated by default - direct to Sign In / Register
          setUser(null);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time listener for current user document updates in Firestore (for immediate suspension/unblock response)
  useEffect(() => {
    if (!user?.uid) return;

    try {
      const unsubUser = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
        if (docSnap.exists()) {
          const uData = docSnap.data();
          setUser(prev => {
            if (!prev) return null;
            const updated: UserProfile = {
              ...prev,
              displayName: uData.displayName || uData.name || prev.displayName,
              photoURL: uData.photoURL !== undefined ? uData.photoURL : prev.photoURL,
              status: uData.status || (uData.isBlocked ? 'blocked' : 'active'),
              isBlocked: uData.isBlocked === true || uData.status === 'blocked' || uData.status === 'suspended',
              blockReason: uData.blockReason || '',
              blockMessage: uData.blockMessage || '',
              blockedAt: uData.blockedAt || '',
              role: uData.role || (uData.isAdmin ? 'admin' : prev.role || 'user'),
              points: uData.points !== undefined ? uData.points : prev.points,
              isPremium: uData.isPremium !== undefined ? uData.isPremium : prev.isPremium,
            };
            localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(updated));
            return updated;
          });
        }
      }, (err) => {
        console.warn('Realtime user profile watch notice:', err);
      });

      return () => unsubUser();
    } catch (e) {
      console.warn('Error setting onSnapshot for user:', e);
    }
  }, [user?.uid]);

  const login = async (email: string, pass: string): Promise<boolean> => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Check Rate Limit / Brute-Force lockout
    const rateLimit = checkLoginRateLimit(cleanEmail);
    if (rateLimit.isLocked) {
      throw new Error(
        `Account temporarily locked due to multiple failed login attempts. Please wait ${rateLimit.remainingSeconds}s before trying again or use "Forgot Password".`
      );
    }

    try {
      const res = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      // Reset rate limit attempts counter on success
      resetLoginAttempts(cleanEmail);

      const profile = await syncFirestoreUserProfile(res.user);
      setUser(profile);
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(profile));
      return true;
    } catch (err: any) {
      // Allow guest accounts to succeed smoothly without blocking
      if (cleanEmail.startsWith('guest_')) {
        const fallbackUid = 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
        const generatedIdNumber = Math.floor(10000000 + Math.random() * 90000000).toString();
        const userDisplayName = cleanEmail.split('@')[0] || 'Guest User';
        const newUser: UserProfile = {
          uid: fallbackUid,
          email: cleanEmail,
          displayName: userDisplayName,
          photoURL: '',
          gender: 'Male',
          age: 20,
          idNumber: generatedIdNumber,
          isPremium: false,
          points: 50,
          bio: 'MaxPlay Guest',
          status: 'active',
          isBlocked: false,
          role: 'user',
          createdAt: new Date().toISOString()
        };
        setUser(newUser);
        localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(newUser));
        return true;
      }

      // Record failed attempt for rate limiting & bot attack protection
      const attemptInfo = recordFailedAttempt(cleanEmail);

      if (err?.code === 'auth/too-many-requests') {
        throw new Error('Access to this account has been temporarily disabled due to many failed login attempts. Please reset your password or try again later.');
      }

      if (attemptInfo.isLocked) {
        throw new Error(
          `Security Alert: Account locked for ${attemptInfo.remainingSeconds} seconds due to 5 consecutive failed attempts. Please use "Forgot Password" to recover your account.`
        );
      }

      if (attemptInfo.attempts >= 3) {
        throw new Error(
          `Incorrect password. Security Warning: ${attemptInfo.remainingAttempts} attempt(s) remaining before temporary lockout.`
        );
      }

      if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        throw new Error('Incorrect password. Please try again or click "Forgot Password?".');
      }

      if (err?.code === 'auth/user-not-found') {
        throw new Error('No account found with this email. Please check the email or sign up.');
      }

      if (err?.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      }

      if (err?.code === 'auth/user-disabled') {
        throw new Error('This account has been disabled. Please contact customer support.');
      }

      throw new Error(err?.message || 'Login failed. Please check your credentials.');
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
    } catch (err: any) {
      console.warn('sendPasswordResetEmail failed:', err);
      if (err?.code === 'auth/user-not-found') {
        throw new Error('No account found with this email address.');
      }
      if (err?.code === 'auth/invalid-email') {
        throw new Error('Invalid email address format.');
      }
      if (err?.code === 'auth/too-many-requests') {
        throw new Error('Too many requests. Please wait a few moments before requesting another link.');
      }
      throw new Error(err?.message || 'Failed to send password reset email.');
    }
  };

  const register = async (name: string, email: string, pass: string): Promise<boolean> => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      const userRef = doc(db, 'users', res.user.uid);
      const generatedIdNumber = res.user.uid.substring(0, 8);
      const newProfileData = {
        id: res.user.uid,
        uid: res.user.uid,
        email,
        displayName: name || 'MaxPlay User',
        name: name || 'MaxPlay User',
        photoURL: '',
        avatar: '',
        gender: 'Male',
        age: 18,
        bio: 'New MaxPlay Streamer',
        isPremium: false,
        points: 50,
        role: 'user',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
      await setDoc(userRef, newProfileData, { merge: true });
      const profile: UserProfile = {
        uid: res.user.uid,
        email,
        displayName: name || 'MaxPlay User',
        photoURL: '',
        gender: 'Male',
        age: 18,
        idNumber: generatedIdNumber,
        isPremium: false,
        points: 50,
        bio: newProfileData.bio
      };
      setUser(profile);
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(profile));
      return true;
    } catch (err) {
      const fallbackUid = 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
      const generatedIdNumber = Math.floor(10000000 + Math.random() * 90000000).toString();
      const userDisplayName = name || (email && email.includes('@') ? email.split('@')[0] : 'MaxPlay User');
      const newUser: UserProfile = {
        uid: fallbackUid,
        email: email || `${userDisplayName.toLowerCase().replace(/\s+/g, '')}@maxplay.app`,
        displayName: userDisplayName,
        photoURL: '',
        gender: 'Male',
        age: 18,
        idNumber: generatedIdNumber,
        isPremium: false,
        points: 50,
        bio: 'New MaxPlay Streamer',
        status: 'active',
        isBlocked: false,
        role: 'user',
        createdAt: new Date().toISOString()
      };
      setUser(newUser);
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(newUser));

      // Always save to Firestore users collection
      try {
        await setDoc(doc(db, 'users', fallbackUid), {
          id: fallbackUid,
          uid: fallbackUid,
          email: newUser.email,
          displayName: newUser.displayName,
          name: newUser.displayName,
          photoURL: '',
          avatar: '',
          gender: newUser.gender,
          age: newUser.age,
          bio: newUser.bio,
          isPremium: false,
          points: 50,
          role: 'user',
          status: 'active',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.warn('Firestore fallback register sync failed:', e);
      }

      return true;
    }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      const provider = new GoogleAuthProvider();
      // Force Google account selection screen so the user always sees the Gmail selector popup
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      // Detect mobile phone, PWA standalone, or iframe constraint
      const isMobileOrPwa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobi|standalone/i.test(navigator.userAgent) || 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.self !== window.top); // Inside preview iframe

      if (isMobileOrPwa) {
        console.log('Mobile/PWA detected. Initiating Google Sign-In with Redirect...');
        await signInWithRedirect(auth, provider);
        // The page will redirect, so returning true
        return true;
      }

      console.log('Desktop detected. Initiating Google Sign-In with Popup...');
      const res = await signInWithPopup(auth, provider);
      const googleUser = res.user;
      const uid = googleUser.uid;
      const generatedIdNumber = uid.substring(0, 8);

      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      let profileData: UserProfile;
      if (userSnap.exists()) {
        const d = userSnap.data();
        profileData = {
          uid,
          email: googleUser.email || d.email || `${uid.substring(0, 6)}@gmail.com`,
          displayName: googleUser.displayName || d.displayName || d.name || 'Google User',
          photoURL: googleUser.photoURL || d.photoURL || d.avatar || '',
          gender: d.gender || 'Male',
          age: d.age || 20,
          idNumber: d.idNumber || generatedIdNumber,
          isPremium: d.isPremium || false,
          points: d.points || 50,
          bio: d.bio || 'MaxPlay Google Streamer',
          status: d.status || 'active',
          isBlocked: d.isBlocked || false,
          role: d.role || 'user',
          createdAt: d.createdAt || new Date().toISOString()
        };
      } else {
        profileData = {
          uid,
          email: googleUser.email || `${uid.substring(0, 6)}@gmail.com`,
          displayName: googleUser.displayName || 'Google User',
          photoURL: googleUser.photoURL || '',
          gender: 'Male',
          age: 20,
          idNumber: generatedIdNumber,
          isPremium: false,
          points: 50,
          bio: 'MaxPlay Google Streamer',
          status: 'active',
          isBlocked: false,
          role: 'user',
          createdAt: new Date().toISOString()
        };
        await setDoc(userRef, {
          id: uid,
          uid,
          email: profileData.email,
          displayName: profileData.displayName,
          name: profileData.displayName,
          photoURL: profileData.photoURL,
          avatar: profileData.photoURL,
          gender: profileData.gender,
          age: profileData.age,
          idNumber: generatedIdNumber,
          bio: profileData.bio,
          isPremium: false,
          points: 50,
          role: 'user',
          status: 'active',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        }, { merge: true });
      }

      setUser(profileData);
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(profileData));
      return true;
    } catch (err: any) {
      console.warn('Firebase Google Sign-In failed:', err);
      
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        return false;
      }

      if (window.self !== window.top) {
        throw new Error('Google Login inside preview iframe is blocked. Please use "Open in New Tab" ↗️ to login with Google, or sign in with Email/Guest.');
      }
      
      throw new Error(err?.message || 'Google Sign-In failed. Please try again.');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      // ignore
    }
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
  };

  const updateProfile = async (data: Partial<UserProfile>): Promise<boolean> => {
    if (!user) return false;
    const updated = { ...user, ...data };
    setUser(updated);
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(updated));

    // Update Firebase Auth current user if displayName or photoURL changed
    if (auth.currentUser) {
      try {
        const authUpdates: { displayName?: string; photoURL?: string } = {};
        if (data.displayName !== undefined) authUpdates.displayName = data.displayName;
        if (data.photoURL !== undefined) authUpdates.photoURL = data.photoURL;
        if (Object.keys(authUpdates).length > 0) {
          await updateFirebaseAuthProfile(auth.currentUser, authUpdates);
        }
      } catch (err) {
        console.warn('Firebase Auth updateProfile warning:', err);
      }
    }

    // Save to Firestore users/{uid} collection
    if (user.uid) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          ...data,
          displayName: data.displayName || user.displayName,
          name: data.displayName || user.displayName,
          photoURL: data.photoURL !== undefined ? data.photoURL : (user.photoURL || ''),
          avatar: data.photoURL !== undefined ? data.photoURL : (user.photoURL || ''),
          gender: data.gender || user.gender,
          age: data.age || user.age,
          bio: data.bio !== undefined ? data.bio : user.bio,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.warn('Update user firestore document warning:', e);
      }
    }
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        loginWithGoogle,
        logout,
        updateProfile,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export const useAuth = useAuthContext;
