import assert from 'node:assert/strict';
import test from 'node:test';
import {
  APP_LANGUAGES,
  ASSISTANT_LANGUAGE_OPTIONS,
  ASSISTANT_LANGUAGES,
  filterLanguageOptions,
  isValidAppLanguage,
  isValidAssistantLanguage,
} from '../assistant/companion';
import {
  describeTimezone,
  filterTimezones,
  formatOffsetMinutes,
  getAllTimezoneOptions,
  parseOffsetLabelToMinutes,
  parseTimezoneId,
} from './timezones';

test('formatOffsetMinutes formats UTC offsets cleanly with tabular padding', () => {
  assert.equal(formatOffsetMinutes(0), 'UTC+00:00');
  assert.equal(formatOffsetMinutes(330), 'UTC+05:30');
  assert.equal(formatOffsetMinutes(-480), 'UTC-08:00');
  assert.equal(formatOffsetMinutes(345), 'UTC+05:45');
});

test('parseOffsetLabelToMinutes parses GMT and UTC offsets', () => {
  assert.equal(parseOffsetLabelToMinutes('GMT'), 0);
  assert.equal(parseOffsetLabelToMinutes('UTC'), 0);
  assert.equal(parseOffsetLabelToMinutes('GMT+05:30'), 330);
  assert.equal(parseOffsetLabelToMinutes('GMT-05:00'), -300);
  assert.equal(parseOffsetLabelToMinutes('UTC+9'), 540);
});

test('parseTimezoneId handles 2-segment, 3-segment, and UTC zones', () => {
  assert.deepEqual(parseTimezoneId('Asia/Colombo'), { region: 'Asia', city: 'Colombo' });
  assert.deepEqual(parseTimezoneId('America/New_York'), { region: 'America', city: 'New York' });
  assert.deepEqual(parseTimezoneId('America/Argentina/Buenos_Aires'), {
    region: 'America',
    city: 'Buenos Aires, Argentina',
  });
  assert.deepEqual(parseTimezoneId('UTC'), { region: 'UTC', city: 'UTC' });
});

test('describeTimezone and filterTimezones search by city, country, offset, and region', () => {
  const fixedDate = new Date('2026-06-15T12:00:00Z');
  const colombo = describeTimezone('Asia/Colombo', fixedDate);
  assert.equal(colombo.offsetLabel, 'UTC+05:30');
  assert.equal(colombo.currentTime, '17:30');
  assert.match(colombo.countryHint, /Sri Lanka/i);

  const zones = getAllTimezoneOptions(fixedDate);
  assert.ok(zones.length >= 30);

  const byCountry = filterTimezones(zones, 'Sri Lanka');
  assert.equal(byCountry[0]?.id, 'Asia/Colombo');

  const byOffset = filterTimezones(zones, '+5:30');
  assert.ok(byOffset.some((z) => z.id === 'Asia/Colombo'));

  const byCity = filterTimezones(zones, 'Tokyo');
  assert.equal(byCity[0]?.id, 'Asia/Tokyo');

  const europeOnly = filterTimezones(zones, '', 'Europe');
  assert.ok(europeOnly.length > 0);
  assert.ok(europeOnly.every((z) => z.region === 'Europe'));
});

test('international language catalog includes country codes and supports search filtering', () => {
  assert.ok(APP_LANGUAGES.every((item) => item.countryCode.length === 2));
  assert.ok(ASSISTANT_LANGUAGE_OPTIONS.every((item) => item.countryCode.length === 2));
  assert.equal(ASSISTANT_LANGUAGES.length, ASSISTANT_LANGUAGE_OPTIONS.length);

  // Backwards compatibility for original languages
  for (const code of ['en', 'si', 'ta', 'es', 'fr', 'de', 'pt', 'hi', 'ja', 'ko', 'zh', 'ar']) {
    assert.equal(isValidAppLanguage(code), true, `Expected ${code} to be valid`);
  }
  for (const lang of ['English', 'Sinhala', 'Tamil', 'Japanese', 'Mandarin Chinese', 'Arabic']) {
    assert.equal(isValidAssistantLanguage(lang), true, `Expected ${lang} to be valid`);
  }

  // Search by native script, country keyword, and ISO code
  const sinhalaResults = filterLanguageOptions(APP_LANGUAGES, 'සිංහල');
  assert.equal(sinhalaResults[0]?.code, 'si');

  const lankaResults = filterLanguageOptions(ASSISTANT_LANGUAGE_OPTIONS, 'Sri Lanka');
  assert.ok(lankaResults.some((item) => item.value === 'Sinhala'));

  const japanResults = filterLanguageOptions(APP_LANGUAGES, 'nihongo');
  assert.equal(japanResults[0]?.code, 'ja');
});
