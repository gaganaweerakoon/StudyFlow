export interface TimezoneOption {
  id: string;
  region: string;
  city: string;
  offsetMinutes: number;
  offsetLabel: string;
  shortName: string;
  countryHint: string;
  currentTime: string;
}

const FALLBACK_TIMEZONES = [
  'UTC',
  'Asia/Colombo',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Bangkok',
  'Asia/Jakarta',
  'Asia/Manila',
  'Asia/Karachi',
  'Asia/Dhaka',
  'Asia/Riyadh',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Stockholm',
  'Europe/Warsaw',
  'Europe/Istanbul',
  'Europe/Moscow',
  'Europe/Kyiv',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Sao_Paulo',
  'America/Mexico_City',
  'America/Argentina/Buenos_Aires',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Nairobi',
  'Africa/Lagos',
];

const COUNTRY_HINTS: Record<string, string> = {
  UTC: 'Coordinated Universal Time GMT',
  'Asia/Colombo': 'Sri Lanka IST',
  'Asia/Kolkata': 'India Mumbai Delhi Bengaluru IST',
  'Asia/Calcutta': 'India IST',
  'Asia/Dubai': 'United Arab Emirates UAE Abu Dhabi GST',
  'Asia/Singapore': 'Singapore SGT',
  'Asia/Kuala_Lumpur': 'Malaysia MYT',
  'Asia/Tokyo': 'Japan JST',
  'Asia/Seoul': 'South Korea KST',
  'Asia/Shanghai': 'China Beijing CST',
  'Asia/Hong_Kong': 'Hong Kong HKT',
  'Asia/Taipei': 'Taiwan CST',
  'Asia/Bangkok': 'Thailand ICT',
  'Asia/Ho_Chi_Minh': 'Vietnam Saigon ICT',
  'Asia/Jakarta': 'Indonesia WIB',
  'Asia/Manila': 'Philippines PHT',
  'Asia/Karachi': 'Pakistan PKT',
  'Asia/Dhaka': 'Bangladesh BST',
  'Asia/Kathmandu': 'Nepal NPT',
  'Asia/Riyadh': 'Saudi Arabia AST',
  'Asia/Jerusalem': 'Israel IST',
  'Asia/Qatar': 'Qatar AST',
  'Europe/London': 'United Kingdom UK Britain England GMT BST',
  'Europe/Dublin': 'Ireland GMT IST',
  'Europe/Lisbon': 'Portugal WET WEST',
  'Europe/Paris': 'France CET CEST',
  'Europe/Berlin': 'Germany CET CEST',
  'Europe/Madrid': 'Spain CET CEST',
  'Europe/Rome': 'Italy CET CEST',
  'Europe/Amsterdam': 'Netherlands Holland CET CEST',
  'Europe/Brussels': 'Belgium CET CEST',
  'Europe/Zurich': 'Switzerland CET CEST',
  'Europe/Vienna': 'Austria CET CEST',
  'Europe/Stockholm': 'Sweden CET CEST',
  'Europe/Oslo': 'Norway CET CEST',
  'Europe/Copenhagen': 'Denmark CET CEST',
  'Europe/Warsaw': 'Poland CET CEST',
  'Europe/Prague': 'Czech Republic Czechia CET CEST',
  'Europe/Athens': 'Greece EET EEST',
  'Europe/Helsinki': 'Finland EET EEST',
  'Europe/Kyiv': 'Ukraine Kiev EET EEST',
  'Europe/Istanbul': 'Turkey TRT',
  'Europe/Moscow': 'Russia MSK',
  'America/New_York': 'United States USA Eastern EST EDT',
  'America/Chicago': 'United States USA Central CST CDT',
  'America/Denver': 'United States USA Mountain MST MDT',
  'America/Los_Angeles': 'United States USA Pacific California PST PDT',
  'America/Phoenix': 'United States USA Arizona MST',
  'America/Anchorage': 'United States USA Alaska AKST AKDT',
  'Pacific/Honolulu': 'United States USA Hawaii HST',
  'America/Toronto': 'Canada Eastern EST EDT',
  'America/Vancouver': 'Canada Pacific PST PDT',
  'America/Mexico_City': 'Mexico CST',
  'America/Bogota': 'Colombia COT',
  'America/Lima': 'Peru PET',
  'America/Santiago': 'Chile CLT',
  'America/Sao_Paulo': 'Brazil BRT',
  'America/Argentina/Buenos_Aires': 'Argentina ART',
  'Australia/Sydney': 'Australia AEST AEDT',
  'Australia/Melbourne': 'Australia AEST AEDT',
  'Australia/Brisbane': 'Australia AEST',
  'Australia/Perth': 'Australia AWST',
  'Pacific/Auckland': 'New Zealand NZST NZDT',
  'Africa/Cairo': 'Egypt EET',
  'Africa/Johannesburg': 'South Africa SAST',
  'Africa/Nairobi': 'Kenya EAT',
  'Africa/Lagos': 'Nigeria WAT',
  'Africa/Casablanca': 'Morocco WET',
};

export function getDeviceTimeZone(): string {
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (resolved && resolved.trim()) return resolved;
  } catch {
    // Fallback below
  }
  return 'UTC';
}

export function formatOffsetMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes === 0) return 'UTC+00:00';
  const sign = minutes >= 0 ? '+' : '-';
  const abs = Math.abs(Math.round(minutes));
  const hrs = String(Math.floor(abs / 60)).padStart(2, '0');
  const mins = String(abs % 60).padStart(2, '0');
  return `UTC${sign}${hrs}:${mins}`;
}

export function parseOffsetLabelToMinutes(raw: string): number {
  const cleaned = raw.trim().toUpperCase();
  if (cleaned === 'GMT' || cleaned === 'UTC' || cleaned === 'Z') return 0;
  const match = cleaned.match(/^(?:GMT|UTC)?([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2]);
  const mins = Number(match[3] ?? '0');
  return sign * (hours * 60 + mins);
}

export function parseTimezoneId(id: string): { region: string; city: string } {
  if (id === 'UTC' || !id.includes('/')) {
    return { region: 'UTC', city: id.replace(/_/g, ' ') };
  }
  const parts = id.split('/');
  const region = parts[0].replace(/_/g, ' ');
  const rest = parts.slice(1).map((part) => part.replace(/_/g, ' '));
  const city = rest.length > 1 ? `${rest[rest.length - 1]}, ${rest.slice(0, -1).join(' ')}` : rest[0];
  return { region, city };
}

export function describeTimezone(id: string, now = new Date()): TimezoneOption {
  const { region, city } = parseTimezoneId(id);
  let offsetMinutes = 0;
  let shortName = '';
  let currentTime = '';

  try {
    const longOffsetParts = new Intl.DateTimeFormat('en-US', {
      timeZone: id,
      timeZoneName: 'longOffset',
    }).formatToParts(now);
    const offsetRaw = longOffsetParts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
    offsetMinutes = parseOffsetLabelToMinutes(offsetRaw);

    const shortParts = new Intl.DateTimeFormat('en-US', {
      timeZone: id,
      timeZoneName: 'short',
    }).formatToParts(now);
    const shortRaw = shortParts.find((part) => part.type === 'timeZoneName')?.value ?? '';
    shortName = /^GMT[+-]/.test(shortRaw) ? '' : shortRaw;

    currentTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: id,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);
  } catch {
    offsetMinutes = 0;
    shortName = '';
    currentTime = '';
  }

  return {
    id,
    region,
    city,
    offsetMinutes,
    offsetLabel: formatOffsetMinutes(offsetMinutes),
    shortName,
    countryHint: COUNTRY_HINTS[id] ?? '',
    currentTime,
  };
}

export function getAllTimezoneOptions(now = new Date()): TimezoneOption[] {
  let ids: string[];
  try {
    const supported =
      typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
    ids = [...new Set(['UTC', 'Asia/Colombo', ...supported])];
  } catch {
    ids = [...FALLBACK_TIMEZONES];
  }

  return ids
    .map((id) => describeTimezone(id, now))
    .sort((a, b) => {
      if (a.offsetMinutes !== b.offsetMinutes) return a.offsetMinutes - b.offsetMinutes;
      return a.city.localeCompare(b.city);
    });
}

function normalizeOffsetSearch(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '').replace(/^gmt/, 'utc');
}

export function filterTimezones(
  options: readonly TimezoneOption[],
  query: string,
  regionFilter = 'All',
): TimezoneOption[] {
  const trimmed = query.trim().toLowerCase();

  let pool = options;
  if (!trimmed && regionFilter && regionFilter !== 'All') {
    pool = options.filter((opt) => {
      if (regionFilter === 'Americas') return opt.region === 'America';
      if (regionFilter === 'Pacific') return opt.region === 'Pacific' || opt.region === 'Australia';
      return opt.region === regionFilter;
    });
  }

  if (!trimmed) return [...pool];

  const normalizedQuery = normalizeOffsetSearch(trimmed);
  const scored: { option: TimezoneOption; score: number }[] = [];

  for (const opt of options) {
    const cityLower = opt.city.toLowerCase();
    const idLower = opt.id.toLowerCase();
    const countryLower = opt.countryHint.toLowerCase();
    const shortLower = opt.shortName.toLowerCase();
    const offsetCompact = opt.offsetLabel.toLowerCase();
    const offsetShort = offsetCompact.replace(/([+-])0(\d)/, '$1$2').replace(/:00$/, '');
    const numericOffsetOnly = offsetCompact.replace(/^utc/, '');
    const numericOffsetShort = offsetShort.replace(/^utc/, '');

    let score = 0;
    if (cityLower === trimmed || idLower === trimmed || shortLower === trimmed) {
      score = 100;
    } else if (cityLower.startsWith(trimmed)) {
      score = 85;
    } else if (countryLower.split(/\s+/).some((word) => word.startsWith(trimmed))) {
      score = 78;
    } else if (
      offsetCompact.includes(normalizedQuery) ||
      offsetShort.includes(normalizedQuery) ||
      numericOffsetOnly === normalizedQuery ||
      numericOffsetShort === normalizedQuery
    ) {
      score = 72;
    } else if (
      cityLower.includes(trimmed) ||
      idLower.includes(trimmed) ||
      countryLower.includes(trimmed) ||
      shortLower.includes(trimmed)
    ) {
      score = 50;
    }

    if (score > 0) {
      scored.push({ option: opt, score });
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.option.offsetMinutes !== b.option.offsetMinutes) {
      return a.option.offsetMinutes - b.option.offsetMinutes;
    }
    return a.option.city.localeCompare(b.option.city);
  });

  return scored.map((item) => item.option);
}

export const TIMEZONE_REGIONS = ['All', 'Asia', 'Europe', 'Americas', 'Pacific', 'Africa'] as const;
