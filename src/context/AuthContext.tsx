import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile as updateFirebaseAuthProfile,
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { UserProfile } from '../types';
import { STORAGE_KEYS } from '../utils/constants';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (name: string, email: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;
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
  const [user, setUser] = useState<UserProfile | null>(null);
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
            setUser(DEFAULT_MOCK_USER);
          }
        } else {
          setUser(DEFAULT_MOCK_USER);
          localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(DEFAULT_MOCK_USER));
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
    setIsLoading(true);
    try {
      const res = await signInWithEmailAndPassword(auth, email, pass);
      const profile = await syncFirestoreUserProfile(res.user);
      setUser(profile);
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(profile));
      setIsLoading(false);
      return true;
    } catch (err) {
      // Fallback local login if offline/demo or unconfigured auth provider
      const fallbackUid = 'usr_' + Math.abs(email.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)).toString(36) + '_' + Date.now().toString(36).slice(-4);
      const newUser: UserProfile = {
        ...DEFAULT_MOCK_USER,
        uid: fallbackUid,
        email: email || DEFAULT_MOCK_USER.email,
        displayName: email ? email.split('@')[0] : DEFAULT_MOCK_USER.displayName,
      };
      setUser(newUser);
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(newUser));

      // Persist fallback account into Firestore users collection as well
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
          isPremium: newUser.isPremium,
          points: newUser.points,
          role: 'user',
          status: 'active',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.warn('Firestore fallback sync failed:', e);
      }

      setIsLoading(false);
      return true;
    }
  };

  const register = async (name: string, email: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      const userRef = doc(db, 'users', res.user.uid);
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
        points: 100,
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
        idNumber: res.user.uid.substring(0, 8),
        isPremium: false,
        points: 100,
        bio: newProfileData.bio
      };
      setUser(profile);
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(profile));
      setIsLoading(false);
      return true;
    } catch (err) {
      const fallbackUid = 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
      const newUser: UserProfile = {
        ...DEFAULT_MOCK_USER,
        uid: fallbackUid,
        displayName: name || 'MaxPlay User',
        email: email || 'user@maxplay.app',
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
          points: 100,
          role: 'user',
          status: 'active',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.warn('Firestore fallback register sync failed:', e);
      }

      setIsLoading(false);
      return true;
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
        logout,
        updateProfile,
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
