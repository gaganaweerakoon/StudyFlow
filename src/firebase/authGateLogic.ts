const DEFAULT_PLACEHOLDER_NAMES = new Set(['', 'student', 'maya lin']);

export type AuthGateState = 'loading' | 'locked' | 'ready';

/**
 * Determines whether the workspace shell is gated behind Google Sign-In.
 * On web, first-time and signed-out users must sign in before entering the app.
 */
export function resolveAuthGateState(params: {
  desktopMode: boolean;
  authReady: boolean;
  hasFirebaseUser: boolean;
  hasDesktopGoogleAccount: boolean;
}): AuthGateState {
  if (params.desktopMode) {
    return params.hasDesktopGoogleAccount ? 'ready' : 'locked';
  }
  if (!params.authReady) {
    return 'loading';
  }
  return params.hasFirebaseUser ? 'ready' : 'locked';
}

export function isPlaceholderStudentName(name: string | null | undefined): boolean {
  return DEFAULT_PLACEHOLDER_NAMES.has((name ?? '').trim().toLowerCase());
}

/**
 * Resolves the canonical student display name synced with Google Sign-In.
 * - Always replaces placeholder names ("Maya Lin", "Student", empty) with the Google account name.
 * - Prefers Google displayName on fresh sign-in, while respecting an explicit non-placeholder cloud name.
 * - Falls back to email prefix only when Google displayName is missing.
 */
export function resolveSyncedDisplayName(params: {
  googleDisplayName?: string | null;
  cloudDisplayName?: string | null;
  currentLocalName?: string | null;
  email?: string | null;
}): string {
  const googleName = (params.googleDisplayName ?? '').trim();
  const cloudName = (params.cloudDisplayName ?? '').trim();
  const localName = (params.currentLocalName ?? '').trim();

  if (cloudName && !isPlaceholderStudentName(cloudName)) {
    return cloudName.slice(0, 120);
  }
  if (googleName && !isPlaceholderStudentName(googleName)) {
    return googleName.slice(0, 120);
  }
  if (localName && !isPlaceholderStudentName(localName)) {
    return localName.slice(0, 120);
  }
  const emailPrefix = (params.email ?? '').trim().split('@')[0]?.trim();
  return (emailPrefix || 'Student').slice(0, 120);
}

export function extractFirstName(fullName: string | null | undefined): string {
  const cleaned = (fullName ?? '').trim();
  if (!cleaned) return 'Student';
  return cleaned.split(/\s+/)[0] || 'Student';
}

export function getTimeOfDayGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
