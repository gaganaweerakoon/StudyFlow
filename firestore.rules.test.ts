import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateUserProfileRule,
  formatGoogleAuthError,
  sanitizeUserProfile,
} from './src/firebase/profileValidation';

const NOW = 1_700_000_000_000;

function validProfile(uid = 'alice_123') {
  return {
    uid,
    displayName: 'Alice Chen',
    email: 'alice@university.edu',
    photoURL: 'https://lh3.googleusercontent.com/a/avatar',
    major: 'Computer Science',
    theme: 'light',
    accentColor: '#4F46E5',
    density: 'compact',
    dailyGoalHours: 4.5,
    weeklyGoalHours: 32,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

test('Dirty Dozen #1–4: unauthenticated, cross-user PII read, list enumeration, and unverified email are rejected', () => {
  assert.equal(
    evaluateUserProfileRule({ operation: 'get', auth: null, pathUserId: 'alice_123' }).allowed,
    false,
  );
  assert.equal(
    evaluateUserProfileRule({
      operation: 'get',
      auth: { uid: 'bob_456', emailVerified: true },
      pathUserId: 'alice_123',
    }).allowed,
    false,
  );
  assert.equal(
    evaluateUserProfileRule({
      operation: 'list',
      auth: { uid: 'alice_123', emailVerified: true },
      pathUserId: 'alice_123',
    }).allowed,
    false,
  );
  assert.equal(
    evaluateUserProfileRule({
      operation: 'create',
      auth: { uid: 'alice_123', emailVerified: false },
      pathUserId: 'alice_123',
      incoming: validProfile('alice_123'),
      serverTime: NOW,
    }).allowed,
    false,
  );
});

test('Dirty Dozen #5–9: identity spoofing, shadow fields, immutable tampering, and timestamp forgery are rejected', () => {
  const aliceAuth = { uid: 'alice_123', emailVerified: true };

  // #5 Identity spoofing
  assert.equal(
    evaluateUserProfileRule({
      operation: 'create',
      auth: aliceAuth,
      pathUserId: 'alice_123',
      incoming: { ...validProfile('alice_123'), uid: 'bob_456' },
      serverTime: NOW,
    }).allowed,
    false,
  );

  // #6 Shadow field injection on create
  assert.equal(
    evaluateUserProfileRule({
      operation: 'create',
      auth: aliceAuth,
      pathUserId: 'alice_123',
      incoming: { ...validProfile('alice_123'), isAdmin: true },
      serverTime: NOW,
    }).allowed,
    false,
  );

  // #7 Shadow field injection on update
  const existing = validProfile('alice_123');
  assert.equal(
    evaluateUserProfileRule({
      operation: 'update',
      auth: aliceAuth,
      pathUserId: 'alice_123',
      existing,
      incoming: { ...existing, plan: 'enterprise', updatedAt: NOW + 1000 },
      serverTime: NOW + 1000,
    }).allowed,
    false,
  );

  // #8 Immutable createdAt tampering
  assert.equal(
    evaluateUserProfileRule({
      operation: 'update',
      auth: aliceAuth,
      pathUserId: 'alice_123',
      existing,
      incoming: { ...existing, createdAt: NOW - 5000, updatedAt: NOW + 1000 },
      serverTime: NOW + 1000,
    }).allowed,
    false,
  );

  // #9 Client timestamp forgery
  assert.equal(
    evaluateUserProfileRule({
      operation: 'create',
      auth: aliceAuth,
      pathUserId: 'alice_123',
      incoming: { ...validProfile('alice_123'), createdAt: NOW - 10_000 },
      serverTime: NOW,
    }).allowed,
    false,
  );
});

test('Dirty Dozen #10–12: path ID poisoning, oversized strings, javascript: photoURL, and bad enums are rejected', () => {
  const aliceAuth = { uid: 'alice_123', emailVerified: true };

  // #10 Path ID poisoning
  assert.equal(
    evaluateUserProfileRule({
      operation: 'get',
      auth: { uid: '../admin', emailVerified: true },
      pathUserId: '../admin',
    }).allowed,
    false,
  );

  // #11 Oversized displayName & javascript: photoURL
  assert.equal(
    evaluateUserProfileRule({
      operation: 'create',
      auth: aliceAuth,
      pathUserId: 'alice_123',
      incoming: { ...validProfile('alice_123'), displayName: 'A'.repeat(200) },
      serverTime: NOW,
    }).allowed,
    false,
  );
  assert.equal(
    evaluateUserProfileRule({
      operation: 'create',
      auth: aliceAuth,
      pathUserId: 'alice_123',
      incoming: { ...validProfile('alice_123'), photoURL: 'javascript:alert(1)' },
      serverTime: NOW,
    }).allowed,
    false,
  );

  // #12 Invalid enum / accent color / out-of-range goal hours
  assert.equal(
    evaluateUserProfileRule({
      operation: 'create',
      auth: aliceAuth,
      pathUserId: 'alice_123',
      incoming: { ...validProfile('alice_123'), theme: 'neon-hack' },
      serverTime: NOW,
    }).allowed,
    false,
  );
  assert.equal(
    evaluateUserProfileRule({
      operation: 'create',
      auth: aliceAuth,
      pathUserId: 'alice_123',
      incoming: { ...validProfile('alice_123'), dailyGoalHours: 99 },
      serverTime: NOW,
    }).allowed,
    false,
  );
});

test('Valid verified owner create, get, update, and delete pass rules cleanly', () => {
  const aliceAuth = { uid: 'alice_123', emailVerified: true };
  const base = validProfile('alice_123');

  assert.equal(
    evaluateUserProfileRule({
      operation: 'create',
      auth: aliceAuth,
      pathUserId: 'alice_123',
      incoming: base,
      serverTime: NOW,
    }).allowed,
    true,
  );
  assert.equal(
    evaluateUserProfileRule({
      operation: 'get',
      auth: aliceAuth,
      pathUserId: 'alice_123',
    }).allowed,
    true,
  );
  assert.equal(
    evaluateUserProfileRule({
      operation: 'update',
      auth: aliceAuth,
      pathUserId: 'alice_123',
      existing: base,
      incoming: { ...base, major: 'Bioinformatics', updatedAt: NOW + 5000 },
      serverTime: NOW + 5000,
    }).allowed,
    true,
  );
  assert.equal(
    evaluateUserProfileRule({
      operation: 'delete',
      auth: aliceAuth,
      pathUserId: 'alice_123',
    }).allowed,
    true,
  );
});

test('sanitizeUserProfile clamps values and strips unsafe URLs; formatGoogleAuthError returns friendly text', () => {
  const clean = sanitizeUserProfile({
    uid: 'user-99',
    displayName: '  ' + 'X'.repeat(160),
    email: 'student@school.edu',
    photoURL: 'javascript:evil()',
    major: 'Physics',
    theme: 'invalid-theme',
    accentColor: 'red',
    density: 'huge',
    dailyGoalHours: 40,
    weeklyGoalHours: 0,
  });

  assert.equal(clean.displayName.length, 120);
  assert.equal(clean.photoURL, '');
  assert.equal(clean.theme, 'light');
  assert.equal(clean.accentColor, '#4F46E5');
  assert.equal(clean.density, 'compact');
  assert.equal(clean.dailyGoalHours, 24);
  assert.equal(clean.weeklyGoalHours, 1);

  for (const theme of ['light', 'dark', 'midnight', 'ocean', 'forest', 'warm'] as const) {
    assert.equal(
      evaluateUserProfileRule({
        operation: 'create',
        auth: { uid: 'alice_123', emailVerified: true },
        pathUserId: 'alice_123',
        incoming: { ...validProfile('alice_123'), theme },
        serverTime: NOW,
      }).allowed,
      true,
    );
  }

  assert.match(formatGoogleAuthError({ code: 'auth/popup-blocked' }), /blocked the Google sign-in popup/i);
  assert.match(formatGoogleAuthError({ code: 'auth/popup-closed-by-user' }), /canceled/i);
  const unwrapped = formatGoogleAuthError(
    new Error(JSON.stringify({ error: 'Missing or insufficient permissions.', operationType: 'create', path: 'users/abc' })),
  );
  assert.equal(unwrapped.includes('{'), false);
  assert.match(unwrapped, /database permissions/i);
});
