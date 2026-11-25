import type { DensityMode, ThemeId } from '../types/studyflow';

// Verbatim constants synchronized with firebase-blueprint.json & firestore.rules
export const PROFILE_LIMITS = {
  uidMaxLength: 128,
  uidPattern: /^[a-zA-Z0-9_-]+$/,
  displayNameMinLength: 1,
  displayNameMaxLength: 120,
  emailMinLength: 3,
  emailMaxLength: 254,
  emailPattern: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
  photoUrlMaxLength: 1024,
  photoUrlPattern: /^https:\/\/.+/,
  majorMaxLength: 160,
  accentColorPattern: /^#[0-9a-fA-F]{6}$/,
  dailyGoalMin: 0.5,
  dailyGoalMax: 24,
  weeklyGoalMin: 1,
  weeklyGoalMax: 168,
  themes: ['light', 'dark', 'midnight', 'ocean', 'forest', 'warm'] as const,
  densities: ['compact', 'comfortable'] as const,
} as const;

export const ALLOWED_PROFILE_KEYS = new Set([
  'uid',
  'displayName',
  'email',
  'photoURL',
  'major',
  'theme',
  'accentColor',
  'density',
  'dailyGoalHours',
  'weeklyGoalHours',
  'createdAt',
  'updatedAt',
]);

export const MUTABLE_PROFILE_KEYS = new Set([
  'displayName',
  'email',
  'photoURL',
  'major',
  'theme',
  'accentColor',
  'density',
  'dailyGoalHours',
  'weeklyGoalHours',
  'updatedAt',
]);

export interface CloudUserProfileInput {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
  major?: string | null;
  theme?: ThemeId | string;
  accentColor?: string;
  density?: DensityMode | string;
  dailyGoalHours?: number;
  weeklyGoalHours?: number;
}

export interface SanitizedUserProfileData {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  major: string;
  theme: ThemeId;
  accentColor: string;
  density: DensityMode;
  dailyGoalHours: number;
  weeklyGoalHours: number;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, Math.round(num * 10) / 10));
}

export function sanitizePhotoUrl(raw: string | null | undefined): string {
  const trimmed = (raw ?? '').trim().slice(0, PROFILE_LIMITS.photoUrlMaxLength);
  if (!trimmed) return '';
  return PROFILE_LIMITS.photoUrlPattern.test(trimmed) ? trimmed : '';
}

export function sanitizeUserProfile(input: CloudUserProfileInput): SanitizedUserProfileData {
  const uid = (input.uid ?? '').trim().slice(0, PROFILE_LIMITS.uidMaxLength);
  const rawEmail = (input.email ?? '').trim().slice(0, PROFILE_LIMITS.emailMaxLength);
  const fallbackName = rawEmail.includes('@') ? rawEmail.split('@')[0] : 'Student';
  const displayName = ((input.displayName ?? '').trim() || fallbackName || 'Student').slice(
    0,
    PROFILE_LIMITS.displayNameMaxLength,
  );
  const major = (input.major ?? '').trim().slice(0, PROFILE_LIMITS.majorMaxLength);
  const photoURL = sanitizePhotoUrl(input.photoURL);
  const theme: ThemeId = (PROFILE_LIMITS.themes as readonly string[]).includes(String(input.theme))
    ? (input.theme as ThemeId)
    : 'light';
  const accentColor = PROFILE_LIMITS.accentColorPattern.test(String(input.accentColor ?? ''))
    ? String(input.accentColor)
    : '#4F46E5';
  const density: DensityMode = (PROFILE_LIMITS.densities as readonly string[]).includes(
    String(input.density),
  )
    ? (input.density as DensityMode)
    : 'compact';

  return {
    uid,
    displayName,
    email: rawEmail,
    photoURL,
    major,
    theme,
    accentColor,
    density,
    dailyGoalHours: clampNumber(
      input.dailyGoalHours,
      PROFILE_LIMITS.dailyGoalMin,
      PROFILE_LIMITS.dailyGoalMax,
      4.5,
    ),
    weeklyGoalHours: clampNumber(
      input.weeklyGoalHours,
      PROFILE_LIMITS.weeklyGoalMin,
      PROFILE_LIMITS.weeklyGoalMax,
      32,
    ),
  };
}

export interface SimulatedAuthContext {
  uid: string;
  emailVerified: boolean;
}

export interface RulesValidationResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Pure mirror of firestore.rules invariants for unit-testing payloads and
 * enforcing defensive client-side constraints before every Firestore write.
 */
export function evaluateUserProfileRule(params: {
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: SimulatedAuthContext | null;
  pathUserId: string;
  incoming?: Record<string, unknown>;
  existing?: Record<string, unknown>;
  serverTime?: number;
}): RulesValidationResult {
  const { operation, auth, pathUserId, incoming, existing, serverTime = 1_700_000_000_000 } = params;

  if (operation === 'list') {
    return { allowed: false, reason: 'PERMISSION_DENIED: Listing users collection is forbidden.' };
  }
  if (!auth) {
    return { allowed: false, reason: 'PERMISSION_DENIED: Authentication required.' };
  }
  if (!auth.emailVerified) {
    return { allowed: false, reason: 'PERMISSION_DENIED: Verified email required.' };
  }
  if (!PROFILE_LIMITS.uidPattern.test(pathUserId) || pathUserId.length < 1 || pathUserId.length > PROFILE_LIMITS.uidMaxLength) {
    return { allowed: false, reason: 'PERMISSION_DENIED: Invalid path userId.' };
  }
  if (auth.uid !== pathUserId) {
    return { allowed: false, reason: 'PERMISSION_DENIED: Only document owner may access this profile.' };
  }
  if (operation === 'get' || operation === 'delete') {
    return { allowed: true };
  }

  if (!incoming || typeof incoming !== 'object') {
    return { allowed: false, reason: 'PERMISSION_DENIED: Missing payload.' };
  }

  const keys = Object.keys(incoming);
  for (const req of ['uid', 'displayName', 'email', 'createdAt', 'updatedAt']) {
    if (!(req in incoming)) {
      return { allowed: false, reason: `PERMISSION_DENIED: Missing required key "${req}".` };
    }
  }
  for (const key of keys) {
    if (!ALLOWED_PROFILE_KEYS.has(key)) {
      return { allowed: false, reason: `PERMISSION_DENIED: Undeclared shadow field "${key}".` };
    }
  }

  if (
    typeof incoming.uid !== 'string' ||
    !PROFILE_LIMITS.uidPattern.test(incoming.uid) ||
    incoming.uid.length > PROFILE_LIMITS.uidMaxLength ||
    incoming.uid !== auth.uid ||
    incoming.uid !== pathUserId
  ) {
    return { allowed: false, reason: 'PERMISSION_DENIED: Identity mismatch on uid.' };
  }
  if (
    typeof incoming.displayName !== 'string' ||
    incoming.displayName.length < PROFILE_LIMITS.displayNameMinLength ||
    incoming.displayName.length > PROFILE_LIMITS.displayNameMaxLength
  ) {
    return { allowed: false, reason: 'PERMISSION_DENIED: Invalid displayName.' };
  }
  if (
    typeof incoming.email !== 'string' ||
    incoming.email.length < PROFILE_LIMITS.emailMinLength ||
    incoming.email.length > PROFILE_LIMITS.emailMaxLength ||
    !PROFILE_LIMITS.emailPattern.test(incoming.email)
  ) {
    return { allowed: false, reason: 'PERMISSION_DENIED: Invalid email.' };
  }
  if ('photoURL' in incoming) {
    if (
      typeof incoming.photoURL !== 'string' ||
      incoming.photoURL.length > PROFILE_LIMITS.photoUrlMaxLength ||
      (incoming.photoURL !== '' && !PROFILE_LIMITS.photoUrlPattern.test(incoming.photoURL))
    ) {
      return { allowed: false, reason: 'PERMISSION_DENIED: Invalid photoURL.' };
    }
  }
  if ('major' in incoming) {
    if (typeof incoming.major !== 'string' || incoming.major.length > PROFILE_LIMITS.majorMaxLength) {
      return { allowed: false, reason: 'PERMISSION_DENIED: Invalid major.' };
    }
  }
  if ('theme' in incoming && !(PROFILE_LIMITS.themes as readonly string[]).includes(String(incoming.theme))) {
    return { allowed: false, reason: 'PERMISSION_DENIED: Invalid theme enum.' };
  }
  if (
    'accentColor' in incoming &&
    (typeof incoming.accentColor !== 'string' ||
      incoming.accentColor.length > 16 ||
      !PROFILE_LIMITS.accentColorPattern.test(incoming.accentColor))
  ) {
    return { allowed: false, reason: 'PERMISSION_DENIED: Invalid accentColor.' };
  }
  if (
    'density' in incoming &&
    !(PROFILE_LIMITS.densities as readonly string[]).includes(String(incoming.density))
  ) {
    return { allowed: false, reason: 'PERMISSION_DENIED: Invalid density enum.' };
  }
  if ('dailyGoalHours' in incoming) {
    const n = incoming.dailyGoalHours;
    if (typeof n !== 'number' || !Number.isFinite(n) || n < PROFILE_LIMITS.dailyGoalMin || n > PROFILE_LIMITS.dailyGoalMax) {
      return { allowed: false, reason: 'PERMISSION_DENIED: Invalid dailyGoalHours.' };
    }
  }
  if ('weeklyGoalHours' in incoming) {
    const n = incoming.weeklyGoalHours;
    if (typeof n !== 'number' || !Number.isFinite(n) || n < PROFILE_LIMITS.weeklyGoalMin || n > PROFILE_LIMITS.weeklyGoalMax) {
      return { allowed: false, reason: 'PERMISSION_DENIED: Invalid weeklyGoalHours.' };
    }
  }

  if (operation === 'create') {
    if (incoming.createdAt !== serverTime || incoming.updatedAt !== serverTime) {
      return { allowed: false, reason: 'PERMISSION_DENIED: Timestamps must match request.time.' };
    }
    return { allowed: true };
  }

  // Update checks
  if (!existing) {
    return { allowed: false, reason: 'PERMISSION_DENIED: Existing document required for update.' };
  }
  if (incoming.uid !== existing.uid || incoming.createdAt !== existing.createdAt) {
    return { allowed: false, reason: 'PERMISSION_DENIED: Immutable field tampered.' };
  }
  if (incoming.updatedAt !== serverTime) {
    return { allowed: false, reason: 'PERMISSION_DENIED: updatedAt must match request.time.' };
  }
  for (const key of new Set([...Object.keys(incoming), ...Object.keys(existing)])) {
    if (incoming[key] !== existing[key] && !MUTABLE_PROFILE_KEYS.has(key)) {
      return { allowed: false, reason: `PERMISSION_DENIED: Field "${key}" is not mutable.` };
    }
  }

  return { allowed: true };
}

export function formatGoogleAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';
  let message = error instanceof Error ? error.message : String(error ?? '');

  // Unwrap structured FirestoreErrorInfo JSON so raw JSON never reaches the UI
  if (message.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(message) as { error?: string; operationType?: string };
      if (parsed?.error) {
        message = parsed.error;
      }
    } catch {
      // Keep original message if not JSON
    }
  }

  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'Sign-in was canceled before completing.';
    case 'auth/cancelled-popup-request':
      return 'Another sign-in window is already open.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in popup. Allow popups for this site and try again.';
    case 'auth/unauthorized-domain':
      return 'This domain is not yet authorized for Firebase Google Sign-In.';
    case 'auth/network-request-failed':
      return 'Network error while reaching Google Sign-In. Check your connection and try again.';
    case 'auth/operation-not-allowed':
      return 'Google Sign-In is not enabled for this Firebase project yet.';
    case 'auth/too-many-requests':
      return 'Too many sign-in attempts. Please wait a moment and try again.';
    default:
      if (
        code === 'unavailable' ||
        code === 'firestore/unavailable' ||
        message.toLowerCase().includes('client is offline') ||
        message.toLowerCase().includes('temporarily offline') ||
        message.toLowerCase().includes('could not reach cloud firestore backend')
      ) {
        return 'Cloud profile sync is temporarily offline. Your local workspace is saved and will sync once reconnected.';
      }
      if (message.toLowerCase().includes('quota exceeded')) {
        return 'Cloud sync daily quota was reached. Your local workspace still works and cloud quota resets tomorrow.';
      }
      if (message.toLowerCase().includes('missing or insufficient permissions')) {
        return 'Signed in with Google, but cloud profile sync was blocked by database permissions. Please try again in a moment.';
      }
      return message
        ? `Google Sign-In failed: ${message.replace(/^Firebase:\s*/i, '')}`
        : 'Could not complete Google Sign-In. Please try again.';
  }
}
