import React, { useEffect, useRef } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { useApp } from '../context/AppContext';
import { useAuth } from './AuthContext';
import { isPlaceholderStudentName, resolveSyncedDisplayName } from './authGateLogic';

/**
 * Keeps StudyFlow's AppContext profile & appearance preferences synchronized
 * with the authenticated Firebase Google user and their Firestore profile doc.
 */
export const AuthProfileBridge: React.FC = () => {
  const {
    preferences,
    updatePreferences,
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    density,
    setDensity,
  } = useApp();
  const { user, cloudProfile, authReady, saveCloudProfilePatch } = useAuth();

  const hydratedAuthUidRef = useRef<string | null>(null);
  const hydratedCloudUidRef = useRef<string | null>(null);
  const lastSavedSignatureRef = useRef<string>('');

  // Hydrate AppContext when Firebase Auth user / Firestore cloudProfile loads
  useEffect(() => {
    if (isTauri() || !authReady) return;

    if (!user) {
      if (hydratedAuthUidRef.current) {
        const previousGoogle = preferences.googleAccount;
        hydratedAuthUidRef.current = null;
        hydratedCloudUidRef.current = null;
        lastSavedSignatureRef.current = '';
        if (previousGoogle) {
          updatePreferences({
            googleAccount: undefined,
            ...(preferences.name === previousGoogle.name ? { name: 'Student' } : {}),
            ...(preferences.email === previousGoogle.email ? { email: '' } : {}),
          });
        }
      }
      return;
    }

    const effectiveName = resolveSyncedDisplayName({
      googleDisplayName: user.displayName,
      cloudDisplayName: cloudProfile?.displayName,
      currentLocalName: preferences.name,
      email: user.email,
    });
    const effectiveEmail = cloudProfile?.email || user.email || preferences.email;
    const effectivePhoto = cloudProfile?.photoURL || user.photoURL || undefined;

    const alreadyHydratedAuth = hydratedAuthUidRef.current === user.uid;
    const alreadyHydratedCloud = hydratedCloudUidRef.current === user.uid;
    hydratedAuthUidRef.current = user.uid;

    const patch: Partial<typeof preferences> = {
      googleAccount: {
        id: user.uid,
        name: effectiveName,
        email: effectiveEmail,
        photoURL: effectivePhoto,
      },
      email: effectiveEmail,
    };

    const shouldSyncName =
      !alreadyHydratedAuth ||
      (Boolean(cloudProfile) && !alreadyHydratedCloud) ||
      isPlaceholderStudentName(preferences.name);

    if (shouldSyncName && preferences.name !== effectiveName) {
      patch.name = effectiveName;
    }

    if (cloudProfile) {
      hydratedCloudUidRef.current = user.uid;
      if (cloudProfile.major) {
        patch.major = cloudProfile.major;
      }
      patch.dailyGoalHours = cloudProfile.dailyGoalHours;
      patch.weeklyGoalHours = cloudProfile.weeklyGoalHours;

      if (!alreadyHydratedCloud) {
        setTheme(cloudProfile.theme);
        setAccentColor(cloudProfile.accentColor);
        setDensity(cloudProfile.density);
      }

      lastSavedSignatureRef.current = JSON.stringify({
        displayName: effectiveName,
        major: cloudProfile.major || preferences.major,
        theme: cloudProfile.theme,
        accentColor: cloudProfile.accentColor,
        density: cloudProfile.density,
        dailyGoalHours: cloudProfile.dailyGoalHours,
        weeklyGoalHours: cloudProfile.weeklyGoalHours,
      });
    }

    const needsPrefUpdate =
      preferences.googleAccount?.id !== user.uid ||
      preferences.googleAccount?.name !== effectiveName ||
      preferences.googleAccount?.photoURL !== effectivePhoto ||
      preferences.email !== effectiveEmail ||
      Boolean(patch.name) ||
      (Boolean(cloudProfile) && !alreadyHydratedCloud);

    if (needsPrefUpdate) {
      updatePreferences(patch);
    }
  }, [authReady, user, cloudProfile]);

  // Debounce preference edits back to Firestore when signed in
  useEffect(() => {
    if (isTauri() || !user || !user.emailVerified || !cloudProfile) return;

    const resolvedDisplayName = isPlaceholderStudentName(preferences.name)
      ? resolveSyncedDisplayName({
          googleDisplayName: user.displayName,
          cloudDisplayName: cloudProfile.displayName,
          email: user.email,
        })
      : preferences.name.trim();

    const nextPayload = {
      displayName: resolvedDisplayName,
      major: preferences.major,
      theme,
      accentColor,
      density,
      dailyGoalHours: preferences.dailyGoalHours,
      weeklyGoalHours: preferences.weeklyGoalHours,
    };
    const signature = JSON.stringify(nextPayload);
    if (signature === lastSavedSignatureRef.current) return;

    const timer = window.setTimeout(() => {
      lastSavedSignatureRef.current = signature;
      void saveCloudProfilePatch(nextPayload).catch((err) => {
        console.error('Failed to sync profile preferences:', err);
      });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [
    user,
    cloudProfile,
    preferences.name,
    preferences.major,
    preferences.dailyGoalHours,
    preferences.weeklyGoalHours,
    theme,
    accentColor,
    density,
    saveCloudProfilePatch,
  ]);

  return null;
};
