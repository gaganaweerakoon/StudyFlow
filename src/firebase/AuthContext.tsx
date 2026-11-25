import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  isFirestoreOfflineError,
  OperationType,
} from './config';
import {
  formatGoogleAuthError,
  sanitizeUserProfile,
  type CloudUserProfileInput,
  type SanitizedUserProfileData,
} from './profileValidation';
import { isPlaceholderStudentName, resolveSyncedDisplayName } from './authGateLogic';
import { useApp } from '../context/AppContext';
import type { DensityMode, ThemeId } from '../types/studyflow';

export interface CloudUserProfile extends SanitizedUserProfileData {}

interface FirebaseAuthContextValue {
  user: User | null;
  cloudProfile: CloudUserProfile | null;
  authReady: boolean;
  signingIn: boolean;
  syncing: boolean;
  syncingProfile: boolean;
  authError: string;
  clearAuthError: () => void;
  signInWithGoogle: (seed?: Partial<CloudUserProfileInput>) => Promise<User | null>;
  signOutGoogle: () => Promise<void>;
  signOutFromGoogle: () => Promise<void>;
  saveCloudProfilePatch: (patch: Partial<CloudUserProfileInput>) => Promise<void>;
  syncProfileToCloud: () => Promise<void>;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextValue | null>(null);

function parseRemoteProfile(uid: string, data: Record<string, unknown>): CloudUserProfile {
  return sanitizeUserProfile({
    uid,
    displayName: typeof data.displayName === 'string' ? data.displayName : undefined,
    email: typeof data.email === 'string' ? data.email : undefined,
    photoURL: typeof data.photoURL === 'string' ? data.photoURL : undefined,
    major: typeof data.major === 'string' ? data.major : undefined,
    theme: typeof data.theme === 'string' ? (data.theme as ThemeId) : undefined,
    accentColor: typeof data.accentColor === 'string' ? data.accentColor : undefined,
    density: typeof data.density === 'string' ? (data.density as DensityMode) : undefined,
    dailyGoalHours: typeof data.dailyGoalHours === 'number' ? data.dailyGoalHours : undefined,
    weeklyGoalHours: typeof data.weeklyGoalHours === 'number' ? data.weeklyGoalHours : undefined,
  });
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { preferences, theme, accentColor, density, pushToast } = useApp();
  const [user, setUser] = useState<User | null>(null);
  const [cloudProfile, setCloudProfile] = useState<CloudUserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [syncingProfile, setSyncingProfile] = useState(false);
  const [authError, setAuthError] = useState('');

  // Prevent race condition where signInWithGoogle and onAuthStateChanged both call setDoc concurrently
  const inFlightProfileRef = React.useRef<Map<string, Promise<CloudUserProfile | null>>>(new Map());
  const pendingSeedRef = React.useRef<Partial<CloudUserProfileInput> | undefined>(undefined);

  const clearAuthError = useCallback(() => setAuthError(''), []);

  const ensureUserProfileDoc = useCallback(
    async (firebaseUser: User, seed?: Partial<CloudUserProfileInput>) => {
      if (!firebaseUser.emailVerified || !firebaseUser.email) {
        return null;
      }

      const existingPromise = inFlightProfileRef.current.get(firebaseUser.uid);
      if (existingPromise) {
        return existingPromise;
      }

      const effectiveSeed = seed ?? pendingSeedRef.current;
      pendingSeedRef.current = undefined;

      const task = (async (): Promise<CloudUserProfile | null> => {
        const path = `users/${firebaseUser.uid}`;
        const ref = doc(db, 'users', firebaseUser.uid);
        setSyncingProfile(true);
        try {
          // Ensure fresh Firebase Auth ID token is minted before first Firestore request
          await firebaseUser.getIdToken();

          let snap;
          try {
            snap = await getDoc(ref);
          } catch (err) {
            if (isFirestoreOfflineError(err)) {
              // Keep the Google Auth session active in local mode while Firestore reconnects.
              return null;
            }
            handleFirestoreError(err, OperationType.GET, path);
          }

          if (snap.exists()) {
            const existing = parseRemoteProfile(
              firebaseUser.uid,
              snap.data() as Record<string, unknown>,
            );
            const syncedDisplayName = resolveSyncedDisplayName({
              googleDisplayName: firebaseUser.displayName,
              cloudDisplayName: existing.displayName,
              email: firebaseUser.email,
            });
            const sanitized = sanitizeUserProfile({
              ...existing,
              displayName: syncedDisplayName,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL ?? existing.photoURL,
            });
            if (
              sanitized.displayName !== existing.displayName ||
              sanitized.email !== existing.email ||
              sanitized.photoURL !== existing.photoURL
            ) {
              try {
                await updateDoc(ref, {
                  displayName: sanitized.displayName,
                  email: sanitized.email,
                  photoURL: sanitized.photoURL,
                  updatedAt: serverTimestamp(),
                });
              } catch (err) {
                if (!isFirestoreOfflineError(err)) {
                  handleFirestoreError(err, OperationType.UPDATE, path);
                }
              }
            }
            setCloudProfile(sanitized);
            return sanitized;
          }

          const initialDisplayName = resolveSyncedDisplayName({
            googleDisplayName: firebaseUser.displayName,
            currentLocalName: effectiveSeed?.displayName,
            email: firebaseUser.email,
          });

          const created = sanitizeUserProfile({
            uid: firebaseUser.uid,
            displayName: initialDisplayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            major: effectiveSeed?.major ?? '',
            theme: effectiveSeed?.theme ?? 'light',
            accentColor: effectiveSeed?.accentColor ?? '#4F46E5',
            density: effectiveSeed?.density ?? 'compact',
            dailyGoalHours: effectiveSeed?.dailyGoalHours ?? 4.5,
            weeklyGoalHours: effectiveSeed?.weeklyGoalHours ?? 32,
          });

          try {
            await setDoc(ref, {
              ...created,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } catch (err) {
            if (isFirestoreOfflineError(err)) {
              return null;
            }
            handleFirestoreError(err, OperationType.CREATE, path);
          }

          setCloudProfile(created);
          return created;
        } finally {
          inFlightProfileRef.current.delete(firebaseUser.uid);
          setSyncingProfile(false);
        }
      })();

      inFlightProfileRef.current.set(firebaseUser.uid, task);
      return task;
    },
    [],
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (!nextUser) {
        setCloudProfile(null);
        return;
      }
      void ensureUserProfileDoc(nextUser).catch((err) => {
        setAuthError(formatGoogleAuthError(err));
      });
    });
    return () => unsubscribe();
  }, [ensureUserProfileDoc]);

  // Automatically retry profile hydration when network connectivity returns
  useEffect(() => {
    if (!user || cloudProfile) return;
    const handleOnline = () => {
      void ensureUserProfileDoc(user).catch((err) => {
        setAuthError(formatGoogleAuthError(err));
      });
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [user, cloudProfile, ensureUserProfileDoc]);

  const signInWithGoogle = useCallback(
    async (seed?: Partial<CloudUserProfileInput>) => {
      setSigningIn(true);
      setAuthError('');
      const candidateSeedName = seed?.displayName ?? preferences.name;
      pendingSeedRef.current = {
        displayName: isPlaceholderStudentName(candidateSeedName) ? undefined : candidateSeedName,
        major: seed?.major ?? preferences.major,
        theme: seed?.theme ?? theme,
        accentColor: seed?.accentColor ?? accentColor,
        density: seed?.density ?? density,
        dailyGoalHours: seed?.dailyGoalHours ?? preferences.dailyGoalHours,
        weeklyGoalHours: seed?.weeklyGoalHours ?? preferences.weeklyGoalHours,
      };
      try {
        const result = await signInWithPopup(auth, googleProvider);
        setUser(result.user);
        try {
          const synced = await ensureUserProfileDoc(result.user, pendingSeedRef.current);
          const welcomeName =
            synced?.displayName || result.user.displayName || result.user.email || 'your Google account';
          pushToast(`Welcome, ${welcomeName}`);
        } catch (syncErr) {
          const friendlySync = formatGoogleAuthError(syncErr);
          setAuthError(friendlySync);
          pushToast(friendlySync);
        }
        return result.user;
      } catch (err) {
        pendingSeedRef.current = undefined;
        const friendly = formatGoogleAuthError(err);
        setAuthError(friendly);
        if (
          !(typeof err === 'object' && err !== null && 'code' in err &&
            (err as { code?: string }).code === 'auth/popup-closed-by-user')
        ) {
          pushToast(friendly);
        }
        return null;
      } finally {
        setSigningIn(false);
      }
    },
    [
      accentColor,
      density,
      ensureUserProfileDoc,
      preferences.dailyGoalHours,
      preferences.major,
      preferences.name,
      preferences.weeklyGoalHours,
      pushToast,
      theme,
    ],
  );

  const signOutFromGoogle = useCallback(async () => {
    setAuthError('');
    try {
      await signOut(auth);
      setUser(null);
      setCloudProfile(null);
      pushToast('Signed out of Google');
    } catch (err) {
      setAuthError(formatGoogleAuthError(err));
    }
  }, [pushToast]);

  const saveCloudProfilePatch = useCallback(
    async (patch: Partial<CloudUserProfileInput>) => {
      const current = auth.currentUser;
      if (!current || !current.emailVerified || !current.email) return;

      const merged = sanitizeUserProfile({
        uid: current.uid,
        displayName: patch.displayName ?? cloudProfile?.displayName ?? current.displayName,
        email: current.email,
        photoURL: patch.photoURL ?? cloudProfile?.photoURL ?? current.photoURL,
        major: patch.major ?? cloudProfile?.major ?? '',
        theme: patch.theme ?? cloudProfile?.theme ?? 'light',
        accentColor: patch.accentColor ?? cloudProfile?.accentColor ?? '#4F46E5',
        density: patch.density ?? cloudProfile?.density ?? 'compact',
        dailyGoalHours: patch.dailyGoalHours ?? cloudProfile?.dailyGoalHours ?? 4.5,
        weeklyGoalHours: patch.weeklyGoalHours ?? cloudProfile?.weeklyGoalHours ?? 32,
      });

      const path = `users/${current.uid}`;
      const ref = doc(db, 'users', current.uid);
      setSyncingProfile(true);
      try {
        await current.getIdToken();
        const existingSnap = await getDoc(ref);
        if (!existingSnap.exists()) {
          await setDoc(ref, {
            ...merged,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          await updateDoc(ref, {
            displayName: merged.displayName,
            email: merged.email,
            photoURL: merged.photoURL,
            major: merged.major,
            theme: merged.theme,
            accentColor: merged.accentColor,
            density: merged.density,
            dailyGoalHours: merged.dailyGoalHours,
            weeklyGoalHours: merged.weeklyGoalHours,
            updatedAt: serverTimestamp(),
          });
        }
        setCloudProfile(merged);
      } catch (err) {
        if (isFirestoreOfflineError(err)) {
          throw new Error('unavailable: Cloud profile sync is temporarily offline.');
        }
        handleFirestoreError(err, OperationType.WRITE, path);
      } finally {
        setSyncingProfile(false);
      }
    },
    [cloudProfile],
  );

  const syncProfileToCloud = useCallback(async () => {
    try {
      const displayNameToSync = isPlaceholderStudentName(preferences.name)
        ? resolveSyncedDisplayName({
            googleDisplayName: user?.displayName,
            cloudDisplayName: cloudProfile?.displayName,
            email: user?.email,
          })
        : preferences.name.trim();

      await saveCloudProfilePatch({
        displayName: displayNameToSync,
        major: preferences.major,
        theme,
        accentColor,
        density,
        dailyGoalHours: preferences.dailyGoalHours,
        weeklyGoalHours: preferences.weeklyGoalHours,
      });
      pushToast('Profile saved and synced to your Google account');
    } catch (err) {
      const friendly = formatGoogleAuthError(err);
      setAuthError(friendly);
      pushToast(friendly);
    }
  }, [
    accentColor,
    cloudProfile?.displayName,
    density,
    preferences.dailyGoalHours,
    preferences.major,
    preferences.name,
    preferences.weeklyGoalHours,
    pushToast,
    saveCloudProfilePatch,
    theme,
    user?.displayName,
    user?.email,
  ]);

  return (
    <FirebaseAuthContext.Provider
      value={{
        user,
        cloudProfile,
        authReady,
        signingIn,
        syncing: syncingProfile,
        syncingProfile,
        authError,
        clearAuthError,
        signInWithGoogle,
        signOutGoogle: signOutFromGoogle,
        signOutFromGoogle,
        saveCloudProfilePatch,
        syncProfileToCloud,
      }}
    >
      {children}
    </FirebaseAuthContext.Provider>
  );
};

export function useAuth(): FirebaseAuthContextValue {
  const ctx = useContext(FirebaseAuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}

export const useFirebaseAuth = useAuth;
