import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractFirstName,
  getTimeOfDayGreeting,
  isPlaceholderStudentName,
  resolveAuthGateState,
  resolveSyncedDisplayName,
} from './authGateLogic';

test('resolveAuthGateState enforces login before entering app on web and desktop', () => {
  assert.equal(
    resolveAuthGateState({
      desktopMode: false,
      authReady: false,
      hasFirebaseUser: false,
      hasDesktopGoogleAccount: false,
    }),
    'loading',
  );
  assert.equal(
    resolveAuthGateState({
      desktopMode: false,
      authReady: true,
      hasFirebaseUser: false,
      hasDesktopGoogleAccount: false,
    }),
    'locked',
  );
  assert.equal(
    resolveAuthGateState({
      desktopMode: false,
      authReady: true,
      hasFirebaseUser: true,
      hasDesktopGoogleAccount: false,
    }),
    'ready',
  );
  assert.equal(
    resolveAuthGateState({
      desktopMode: true,
      authReady: false,
      hasFirebaseUser: false,
      hasDesktopGoogleAccount: false,
    }),
    'locked',
  );
  assert.equal(
    resolveAuthGateState({
      desktopMode: true,
      authReady: false,
      hasFirebaseUser: false,
      hasDesktopGoogleAccount: true,
    }),
    'ready',
  );
});

test('resolveSyncedDisplayName replaces placeholder names with Google account name', () => {
  assert.equal(isPlaceholderStudentName('Maya Lin'), true);
  assert.equal(isPlaceholderStudentName('Student'), true);
  assert.equal(isPlaceholderStudentName('Gagana Weerakoon'), false);

  assert.equal(
    resolveSyncedDisplayName({
      googleDisplayName: 'Gagana Weerakoon',
      cloudDisplayName: 'Maya Lin',
      currentLocalName: 'Maya Lin',
      email: 'gaganaweerakoon@gmail.com',
    }),
    'Gagana Weerakoon',
  );

  assert.equal(
    resolveSyncedDisplayName({
      googleDisplayName: 'Gagana Weerakoon',
      cloudDisplayName: 'Gagana W.',
      currentLocalName: 'Maya Lin',
      email: 'gaganaweerakoon@gmail.com',
    }),
    'Gagana W.',
  );

  assert.equal(
    resolveSyncedDisplayName({
      googleDisplayName: null,
      cloudDisplayName: null,
      currentLocalName: 'Maya Lin',
      email: 'alex.rivera@university.edu',
    }),
    'alex.rivera',
  );
});

test('extractFirstName and getTimeOfDayGreeting format greetings cleanly', () => {
  assert.equal(extractFirstName('Gagana Weerakoon'), 'Gagana');
  assert.equal(extractFirstName('  '), 'Student');
  assert.equal(getTimeOfDayGreeting(new Date('2026-11-23T09:00:00')), 'Good morning');
  assert.equal(getTimeOfDayGreeting(new Date('2026-11-23T14:30:00')), 'Good afternoon');
  assert.equal(getTimeOfDayGreeting(new Date('2026-11-23T19:15:00')), 'Good evening');
});
