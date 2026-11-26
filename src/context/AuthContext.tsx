import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import type { AccountType, RegionId, UserProfile } from '../data/startups';
import { auth, googleProvider } from '../firebase';
import {
  createUserProfile,
  getUserProfile,
  updateUserProfile,
} from '../services/firestoreService';

const BOOTSTRAP_ADMIN_EMAIL = 'r.alqefari@gmail.com';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  authLoading: boolean;
  profileLoading: boolean;
  isAdmin: boolean;
  needsOnboarding: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<boolean>;
  signOutUser: () => Promise<void>;
  saveUserProfile: (input: {
    displayName: string;
    accountType: AccountType;
    organizationName: string;
    regionId: RegionId;
    contactInfo: string;
  }) => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);

      if (!firebaseUser) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      try {
        const existingProfile = await getUserProfile(firebaseUser.uid);
        setProfile(existingProfile);
      } catch (err) {
        console.error('Failed to load user profile:', err);
        setProfile(null);
      } finally {
        setProfileLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      return true;
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return false;
      }
      if (code === 'auth/popup-blocked') {
        setAuthError('popup-blocked');
      } else {
        setAuthError('sign-in-failed');
      }
      return false;
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthError(null);
    await signOut(auth);
    setProfile(null);
  }, []);

  const saveUserProfile = useCallback(
    async (input: {
      displayName: string;
      accountType: AccountType;
      organizationName: string;
      regionId: RegionId;
      contactInfo: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      if (!profile) {
        const created = await createUserProfile({
          uid: user.uid,
          displayName: input.displayName || user.displayName || 'User',
          email: user.email || '',
          photoURL: user.photoURL || '',
          accountType: input.accountType,
          organizationName: input.organizationName,
          regionId: input.regionId,
          contactInfo: input.contactInfo,
        });
        setProfile(created);
      } else {
        await updateUserProfile(user.uid, {
          displayName: input.displayName || profile.displayName,
          photoURL: user.photoURL || profile.photoURL,
          accountType: input.accountType,
          organizationName: input.organizationName,
          regionId: input.regionId,
          contactInfo: input.contactInfo,
        });
        setProfile({
          ...profile,
          displayName: input.displayName || profile.displayName,
          accountType: input.accountType,
          organizationName: input.organizationName,
          regionId: input.regionId,
          contactInfo: input.contactInfo,
          updatedAtMs: Date.now(),
        });
      }
    },
    [user, profile]
  );

  const isAdmin = Boolean(
    user &&
      user.emailVerified &&
      user.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL
  );

  const needsOnboarding = Boolean(user && !profileLoading && !profile);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        authLoading,
        profileLoading,
        isAdmin,
        needsOnboarding,
        authError,
        signInWithGoogle,
        signOutUser,
        saveUserProfile,
        clearAuthError: () => setAuthError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
