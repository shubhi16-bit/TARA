import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export interface AuthorityProfile {
  uid: string;
  email: string;
  city: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  profile: AuthorityProfile | null;
  loading: boolean;
  profileError: string | null;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  profileError: null,
  logout: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthorityProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (currentUser: User) => {
    setProfileError(null);
    try {
      // 1. Try fetching directly by doc ID = uid
      const docRef = doc(db, 'authorities', currentUser.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile({
          uid: currentUser.uid,
          email: data.email || currentUser.email || '',
          city: data.city || '',
          name: data.name || data.fullName || currentUser.displayName || 'Authority Officer',
          role: data.role || 'Authority',
        });
        return;
      }

      // 2. Fallback: query by email in case document ID was auto-generated
      if (currentUser.email) {
        const qEmail = query(collection(db, 'authorities'), where('email', '==', currentUser.email));
        const emailSnap = await getDocs(qEmail);
        if (!emailSnap.empty) {
          const data = emailSnap.docs[0].data();
          setProfile({
            uid: currentUser.uid,
            email: data.email || currentUser.email,
            city: data.city || '',
            name: data.name || data.fullName || currentUser.displayName || 'Authority Officer',
            role: data.role || 'Authority',
          });
          return;
        }
      }

      // 3. Fallback: query by 'uid' field
      const qUid = query(collection(db, 'authorities'), where('uid', '==', currentUser.uid));
      const uidSnap = await getDocs(qUid);
      if (!uidSnap.empty) {
        const data = uidSnap.docs[0].data();
        setProfile({
          uid: currentUser.uid,
          email: data.email || currentUser.email || '',
          city: data.city || '',
          name: data.name || data.fullName || currentUser.displayName || 'Authority Officer',
          role: data.role || 'Authority',
        });
        return;
      }

      // Profile document is missing
      console.warn(`Authority profile document not found in Firestore for UID: ${currentUser.uid}`);
      setProfile(null);
      setProfileError(`Authority profile not configured in Firestore for ${currentUser.email}. Please ensure document 'authorities/${currentUser.uid}' exists with fields: name, email, city, role.`);
    } catch (err: any) {
      console.error('Error fetching authority profile from Firestore:', err);
      setProfile(null);
      setProfileError(err.message || 'Failed to fetch authority profile from Firestore');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser);
      } else {
        setProfile(null);
        setProfileError(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  const logout = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, profileError, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
