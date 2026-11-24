import type { NoteItem } from '../types/studyflow';

export type NoteFontMode = NonNullable<NoteItem['fontMode']>;

interface ScriptFontSpec {
  id: string;
  label: string;
  regex: RegExp;
  googleFamily: string;
  cssFamilies: string[];
}

const SCRIPT_FONTS: ScriptFontSpec[] = [
  {
    id: 'sinhala',
    label: 'Sinhala',
    regex: /[\u0D80-\u0DFF]/,
    googleFamily: 'Noto+Sans+Sinhala:wght@400;500;600;700',
    cssFamilies: ['Iskoola Pota', 'Nirmala UI', 'Sinhala Sangam MN', 'Noto Sans Sinhala'],
  },
  {
    id: 'tamil',
    label: 'Tamil',
    regex: /[\u0B80-\u0BFF]/,
    googleFamily: 'Noto+Sans+Tamil:wght@400;500;600;700',
    cssFamilies: ['Latha', 'Nirmala UI', 'Tamil Sangam MN', 'Noto Sans Tamil'],
  },
  {
    id: 'devanagari',
    label: 'Devanagari',
    regex: /[\u0900-\u097F]/,
    googleFamily: 'Noto+Sans+Devanagari:wght@400;500;600;700',
    cssFamilies: ['Nirmala UI', 'Mangal', 'Kohinoor Devanagari', 'Noto Sans Devanagari'],
  },
  {
    id: 'bengali',
    label: 'Bengali',
    regex: /[\u0980-\u09FF]/,
    googleFamily: 'Noto+Sans+Bengali:wght@400;500;600;700',
    cssFamilies: ['Vrinda', 'Nirmala UI', 'Bangla Sangam MN', 'Noto Sans Bengali'],
  },
  {
    id: 'arabic',
    label: 'Arabic',
    regex: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/,
    googleFamily: 'Noto+Sans+Arabic:wght@400;500;600;700',
    cssFamilies: ['Segoe UI', 'Tahoma', 'Geeza Pro', 'Noto Sans Arabic'],
  },
  {
    id: 'hebrew',
    label: 'Hebrew',
    regex: /[\u0590-\u05FF]/,
    googleFamily: 'Noto+Sans+Hebrew:wght@400;500;600;700',
    cssFamilies: ['Arial Hebrew', 'Segoe UI', 'Noto Sans Hebrew'],
  },
  {
    id: 'thai',
    label: 'Thai',
    regex: /[\u0E00-\u0E7F]/,
    googleFamily: 'Noto+Sans+Thai:wght@400;500;600;700',
    cssFamilies: ['Leelawadee UI', 'Thonburi', 'Noto Sans Thai'],
  },
  {
    id: 'japanese',
    label: 'Japanese',
    regex: /[\u3040-\u30FF\u31F0-\u31FF]/,
    googleFamily: 'Noto+Sans+JP:wght@400;500;600;700',
    cssFamilies: ['Yu Gothic UI', 'Hiragino Sans', 'Meiryo', 'Noto Sans JP'],
  },
  {
    id: 'korean',
    label: 'Korean',
    regex: /[\uAC00-\uD7AF\u1100-\u11FF]/,
    googleFamily: 'Noto+Sans+KR:wght@400;500;600;700',
    cssFamilies: ['Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR'],
  },
  {
    id: 'cjk',
    label: 'CJK',
    regex: /[\u4E00-\u9FFF]/,
    googleFamily: 'Noto+Sans+SC:wght@400;500;600;700',
    cssFamilies: ['Microsoft YaHei UI', 'PingFang SC', 'Noto Sans SC'],
  },
];

const KNOWN_FONT_ALIASES: Record<string, string[]> = {
  iskoolapota: ['Iskoola Pota', 'IskoolaPota'],
  nirmalaui: ['Nirmala UI', 'NirmalaUI'],
  timesnewroman: ['Times New Roman', 'TimesNewRoman'],
  timesnewromanps: ['Times New Roman'],
  arialunicode: ['Arial Unicode MS', 'Arial'],
  notosanssinhala: ['Noto Sans Sinhala'],
  notoserifsinhala: ['Noto Serif Sinhala'],
  notosanstamil: ['Noto Sans Tamil'],
  notosansdevanagari: ['Noto Sans Devanagari'],
  notosansarabic: ['Noto Sans Arabic'],
  notosansjp: ['Noto Sans JP'],
  notosanssc: ['Noto Sans SC'],
  notosanskr: ['Noto Sans KR'],
  notosans: ['Noto Sans'],
  notoserif: ['Noto Serif'],
  segoeui: ['Segoe UI'],
  calibri: ['Calibri'],
  cambria: ['Cambria'],
  georgia: ['Georgia'],
  helvetica: ['Helvetica Neue', 'Helvetica', 'Arial'],
  arial: ['Arial'],
  couriernew: ['Courier New'],
  yugothic: ['Yu Gothic', 'Yu Gothic UI'],
  microsoftyahei: ['Microsoft YaHei'],
  malgungothic: ['Malgun Gothic'],
  latha: ['Latha'],
  mangal: ['Mangal'],
  bhashitacomplex: ['BhashitaComplex', 'Bhashita'],
  fmabhaya: ['FM Abhaya', 'FMAbhaya', 'Abhaya Libre'],
  abhayalibre: ['Abhaya Libre'],
};

const loadedScripts = new Set<string>();

/**
 * Cleans an internal PDF or DOCX font name (e.g., "BCDEEE+IskoolaPota-Bold", "TimesNewRomanPSMT")
 * into a clean, CSS-usable font family label, or returns undefined if it's an opaque internal ID.
 */
export function cleanDocumentFontName(raw?: string): string | undefined {
  if (!raw) return undefined;
  let name = raw.trim().replace(/^["']+|["']+$/g, '');
  if (!name) return undefined;

  // Reject opaque internal PDF.js / PDF resource names like g_d0_f1, F1, T1_0, C2_0, TT2
  if (/^(?:g_d\d+_f\d+|f\d+|t\d+(?:_\d+)?|c\d+(?:_\d+)?|tt\d+|r\d+)$/i.test(name)) {
    return undefined;
  }

  // Strip 6-letter PDF subset prefix like "ABCDEF+"
  name = name.replace(/^[A-Z]{6}\+/, '');

  // Strip style suffixes while keeping the base family name
  name = name
    .replace(/[,_-]?(BoldItalic|BoldOblique|SemiBoldItalic|Regular|Medium|SemiBold|DemiBold|ExtraBold|Light|Thin|Black|Heavy|Bold|Italic|Oblique|Roman|Book|Condensed)$/i, '')
    .replace(/(PSMT|PS-BoldMT|PS-ItalicMT|PS|MT)$/i, '')
    .replace(/[_-]+$/g, '')
    .trim();

  if (!name || name.length < 2) return undefined;

  const compact = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (KNOWN_FONT_ALIASES[compact]) {
    return KNOWN_FONT_ALIASES[compact][0];
  }

  // Insert spaces into PascalCase names like "IskoolaPota" -> "Iskoola Pota"
  if (!name.includes(' ') && /[a-z][A-Z]/.test(name)) {
    name = name.replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  // Filter out unsafe CSS characters
  name = name.replace(/[;{}<>\\]/g, '').trim();
  return name || undefined;
}

export function detectUnicodeScripts(text: string): ScriptFontSpec[] {
  if (!text) return [];
  return SCRIPT_FONTS.filter((spec) => spec.regex.test(text));
}

/**
 * Lazily injects Google Noto font stylesheets only for non-Latin Unicode scripts
 * actually present in the document, ensuring crisp rendering across languages
 * while prioritizing the document's original local font first.
 */
export function ensureUnicodeFontsForText(text: string): ScriptFontSpec[] {
  const detected = detectUnicodeScripts(text);
  if (typeof document === 'undefined') return detected;

  for (const spec of detected) {
    if (loadedScripts.has(spec.id)) continue;
    loadedScripts.add(spec.id);
    const linkId = `studyflow-unicode-font-${spec.id}`;
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${spec.googleFamily}&display=swap`;
      document.head.appendChild(link);
    }
  }
  return detected;
}

function quoteCssFont(name: string): string {
  const trimmed = name.trim();
  if (/^(sans-serif|serif|monospace|system-ui|-apple-system|ui-sans-serif|ui-serif|ui-monospace)$/i.test(trimmed)) {
    return trimmed;
  }
  return `"${trimmed.replace(/"/g, '')}"`;
}

/**
 * Builds the CSS font-family stack for a note editor & Markdown preview.
 * In "original" mode, puts the document's detected font family first (so local
 * fonts matching the uploaded file render verbatim), followed by script-specific
 * Unicode fonts and clean system fallbacks.
 */
export function resolveNoteFontFamily(
  fontMode: NoteFontMode = 'original',
  originalFont?: string,
  text = '',
): string {
  const detectedScripts = detectUnicodeScripts(text);
  const scriptFonts = detectedScripts.flatMap((s) => s.cssFamilies);
  const unicodeFallbacks = [
    ...scriptFonts,
    'Noto Sans',
    'Segoe UI',
    'system-ui',
    '-apple-system',
    'sans-serif',
  ];

  const dedupe = (list: string[]) => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of list) {
      const key = item.toLowerCase();
      if (!item || seen.has(key)) continue;
      seen.add(key);
      out.push(quoteCssFont(item));
    }
    return out.join(', ');
  };

  if (fontMode === 'mono') {
    return `var(--font-mono), ${dedupe([...scriptFonts, 'Noto Sans', 'monospace'])}`;
  }
  if (fontMode === 'serif') {
    return dedupe(['Georgia', 'Times New Roman', 'Noto Serif', ...scriptFonts, 'serif']);
  }
  if (fontMode === 'sans') {
    return `var(--font-body), ${dedupe(unicodeFallbacks)}`;
  }
  if (fontMode === 'unicode') {
    return dedupe(unicodeFallbacks);
  }

  // Default: 'original' — preserve document's original font first, then Unicode-safe fallbacks
  const originalCandidates: string[] = [];
  if (originalFont) {
    const cleaned = cleanDocumentFontName(originalFont) ?? originalFont;
    originalCandidates.push(cleaned);
    const compact = cleaned.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (KNOWN_FONT_ALIASES[compact]) {
      originalCandidates.push(...KNOWN_FONT_ALIASES[compact]);
    }
    if (originalFont !== cleaned) {
      originalCandidates.push(originalFont.replace(/^[A-Z]{6}\+/, ''));
    }
  }

  // If the note contains non-Latin Unicode text or a detected original font, prioritize original + Unicode stack
  if (originalCandidates.length > 0 || detectedScripts.length > 0) {
    const genericIsSerif =
      originalFont && /serif|times|georgia|cambria|garamond|mincho|abhaya/i.test(originalFont) && !/sans/i.test(originalFont);
    return dedupe([
      ...originalCandidates,
      ...scriptFonts,
      genericIsSerif ? 'Noto Serif' : 'Noto Sans',
      'Segoe UI',
      'system-ui',
      '-apple-system',
      genericIsSerif ? 'serif' : 'sans-serif',
    ]);
  }

  return `var(--font-body), ${dedupe(unicodeFallbacks)}`;
}
