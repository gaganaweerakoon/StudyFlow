const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
  '+': '₊',
  '-': '₋',
  '=': '₌',
  '(': '₍',
  ')': '₎',
};

const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
  '−': '⁻',
  '=': '⁼',
  '(': '⁽',
  ')': '⁾',
  n: 'ⁿ',
};

function toUnicodeSubscript(text: string): string {
  return [...text].map((ch) => SUBSCRIPT_MAP[ch] ?? ch).join('');
}

function toUnicodeSuperscript(text: string): string {
  return [...text].map((ch) => SUPERSCRIPT_MAP[ch] ?? ch).join('');
}

/**
 * Strip leading/trailing ```markdown / ```md / ~~~markdown wrappers
 * (including partial opening fences during AI streaming) and studyflow-meta comments.
 */
export function stripOuterMarkdownFence(raw: string): string {
  let text = raw.replace(/^\uFEFF/, '');
  // Strip any leading studyflow-meta HTML comment that might remain
  text = text.replace(/^\s*<!--\s*studyflow-meta:[\s\S]*?-->\s*/i, '');

  const trimmed = text.trim();
  const openMatch = trimmed.match(/^(?:`{3,}|~{3,})(?:markdown|md)?[ \t]*\r?\n/i);
  if (openMatch) {
    let inner = trimmed.slice(openMatch[0].length);
    // Strip matching closing fence at the very end if present
    inner = inner.replace(/\r?\n(?:`{3,}|~{3,})[ \t]*$/, '');
    return inner.trim();
  }
  return trimmed;
}

/**
 * Convert \ce{...} (mhchem syntax) into standard KaTeX math so KaTeX never renders red \ce errors.
 */
function convertMhchemToKatex(expr: string): string {
  return expr.replace(/\\ce\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, (_match, rawInner: string) => {
    let body = rawInner.trim();
    // Reaction arrows
    body = body
      .replace(/<=>|<->/g, ' \\rightleftharpoons ')
      .replace(/->/g, ' \\rightarrow ')
      .replace(/<-/g, ' \\leftarrow ');

    // Format element tokens & subscripts/charges outside braces
    body = body.replace(
      /([A-Z][a-z]?|\))(\d+)/g,
      (_m, elem: string, count: string) => `${elem === ')' ? ')' : `\\mathrm{${elem}}`}_{${count}}`,
    );
    // Wrap remaining upright element symbols (e.g. Na, Cl, O, H, Cr, K, I) that weren't already wrapped
    body = body.replace(
      /(?<!\\)(?<![A-Za-z{])([A-Z][a-z]?)(?![a-z}])/g,
      '\\mathrm{$1}',
    );
    // Ionic charges like ^{2+}, ^+, ^-, ^2-
    body = body
      .replace(/\^\{([^}]+)\}/g, '^{$1}')
      .replace(/\^(\d*[+-])/g, '^{$1}');

    return body;
  });
}

function isPipeTableRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.includes('|')) return false;
  // Must either start & end with |, or have at least 2 pipes or a separator pattern
  if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length >= 3) return true;
  const pipeCount = (trimmed.match(/(?<!\\)\|/g) ?? []).length;
  return pipeCount >= 2;
}

function isTableSeparatorRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return false;
  const inner = trimmed.replace(/^\|/, '').replace(/\|$/, '');
  const cells = inner.split('|').map((c) => c.trim());
  if (cells.length === 0) return false;
  return cells.every((c) => /^:?[-–—―−]{1,}:?$/.test(c));
}

function countTableColumns(line: string): number {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split(/(?<!\\)\|/).length;
}

function normalizeSeparatorRow(line: string, targetCols: number): string {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const rawCells = trimmed.split('|').map((c) => c.trim());
  const normalizedCells = Array.from({ length: targetCols }, (_, i) => {
    const cell = rawCells[i] ?? '---';
    const leftColon = cell.startsWith(':') ? ':' : '';
    const rightColon = cell.endsWith(':') && cell.length > 1 ? ':' : '';
    return `${leftColon}---${rightColon}`;
  });
  return `| ${normalizedCells.join(' | ')} |`;
}

function escapePipesInsideTableMath(row: string): string {
  // Replace unescaped `|` inside `$...$` on a table row with `\lvert` / `\|` so GFM doesn't split cells
  return row.replace(/\$([^$\n]+)\$/g, (full, inner: string) => {
    if (!inner.includes('|')) return full;
    const fixed = inner.replace(/(?<!\\)\|/g, '\\mid ');
    return `$${fixed}$`;
  });
}

function normalizeTableRowPipes(line: string, targetCols: number): string {
  const safeMath = escapePipesInsideTableMath(line.trim());
  const stripped = safeMath.replace(/^\|/, '').replace(/\|$/, '');
  const cells = stripped.split(/(?<!\\)\|/).map((c) => c.trim());
  if (cells.length < targetCols) {
    while (cells.length < targetCols) cells.push('');
  }
  return `| ${cells.join(' | ')} |`;
}

/**
 * Normalize GFM tables in a non-code markdown segment:
 * - Dedent indented table rows (prevents 4-space code block trap)
 * - Collapse accidental blank lines between pipe rows
 * - Normalize Unicode dashes in separator rows & align column counts
 * - Insert a blank line before/after tables so lists/paragraphs don't swallow them
 * - Auto-add a separator row for 2+ consecutive `| ... |` rows missing a divider
 */
function normalizeTablesInSegment(segment: string): string {
  const lines = segment.split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const cur = lines[i];

    // Check if this line starts a table
    if (isPipeTableRow(cur)) {
      // Gather contiguous table lines (allowing single blank lines between pipe rows)
      const rawTableLines: string[] = [];
      let j = i;
      while (j < lines.length) {
        if (isPipeTableRow(lines[j])) {
          rawTableLines.push(lines[j]);
          j++;
        } else if (
          lines[j].trim() === '' &&
          j + 1 < lines.length &&
          isPipeTableRow(lines[j + 1]) &&
          (rawTableLines.length === 1 || isTableSeparatorRow(rawTableLines[1] ?? '') || isTableSeparatorRow(lines[j + 1]))
        ) {
          // Skip stray blank line inside a table
          j++;
        } else {
          break;
        }
      }

      const hasSeparatorAt1 = rawTableLines.length >= 2 && isTableSeparatorRow(rawTableLines[1]);
      const looksLikeHeaderlessPipeTable =
        !hasSeparatorAt1 &&
        rawTableLines.length >= 2 &&
        rawTableLines.every((l) => l.trim().startsWith('|') && l.trim().endsWith('|')) &&
        countTableColumns(rawTableLines[0]) >= 2 &&
        rawTableLines.every((l) => countTableColumns(l) === countTableColumns(rawTableLines[0]));

      if (hasSeparatorAt1 || looksLikeHeaderlessPipeTable) {
        const colCounts = rawTableLines
          .filter((l) => !isTableSeparatorRow(l))
          .map(countTableColumns);
        const targetCols = Math.max(1, colCounts[0] ?? 1);

        // Preserve optional blockquote prefix (`> `) if the entire table is inside a blockquote
        const quotePrefix = rawTableLines[0].match(/^\s*(?:>\s*)+/)?.[0] ?? '';
        const stripQuote = (l: string) => (quotePrefix ? l.replace(/^\s*(?:>\s*)+/, '') : l);

        // Ensure blank line before table if previous emitted line is non-empty
        if (out.length > 0 && out[out.length - 1].trim() !== '' && !quotePrefix) {
          out.push('');
        }

        const header = normalizeTableRowPipes(stripQuote(rawTableLines[0]), targetCols);
        out.push(`${quotePrefix}${header}`);

        if (hasSeparatorAt1) {
          out.push(`${quotePrefix}${normalizeSeparatorRow(stripQuote(rawTableLines[1]), targetCols)}`);
          for (const bodyLine of rawTableLines.slice(2)) {
            if (isTableSeparatorRow(stripQuote(bodyLine))) continue;
            out.push(`${quotePrefix}${normalizeTableRowPipes(stripQuote(bodyLine), targetCols)}`);
          }
        } else {
          out.push(`${quotePrefix}| ${Array.from({ length: targetCols }, () => '---').join(' | ')} |`);
          for (const bodyLine of rawTableLines.slice(1)) {
            out.push(`${quotePrefix}${normalizeTableRowPipes(stripQuote(bodyLine), targetCols)}`);
          }
        }

        // Ensure blank line after table if next line is non-empty
        if (j < lines.length && lines[j].trim() !== '' && !quotePrefix) {
          out.push('');
        }

        i = j;
        continue;
      }
    }

    out.push(cur);
    i++;
  }

  return out.join('\n');
}

const LATEX_COMMAND_HINT =
  /\\(?:text|mathrm|mathbf|mathit|mathcal|mathbb|frac|dfrac|tfrac|sqrt|sum|prod|int|lim|sin|cos|tan|log|ln|exp|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|omega|Delta|Sigma|Omega|rightarrow|leftarrow|leftrightarrow|rightleftharpoons|Rightarrow|Leftarrow|Leftrightarrow|times|cdot|div|pm|mp|leq|geq|neq|approx|equiv|propto|infty|partial|nabla|ce|overline|underline|vec|hat|bar|left|right|begin|end)\b/;

/**
 * Normalize math delimiters, HTML sub/sup, mhchem, and stray currency $ in a non-code segment.
 */
function normalizeMathAndInlineInSegment(segment: string): string {
  let text = segment;

  // 1. Convert HTML <sub> and <sup> tags cleanly (since skipHtml is enabled for security)
  text = text.replace(/<sub>([^<>]{1,24})<\/sub>/gi, (_m, inner: string) => toUnicodeSubscript(inner));
  text = text.replace(/<sup>([^<>]{1,24})<\/sup>/gi, (_m, inner: string) => toUnicodeSuperscript(inner));
  text = text.replace(/<br\s*\/?>/gi, '  \n');

  // 2. Unwrap inline backticks that wrap explicit LaTeX math (e.g. `$\text{Na}_2\text{CO}_3$` or `$$\frac{a}{b}$$`)
  text = text.replace(/`(\$\$[\s\S]*?\$\$|\$[^`\n$]+\$)`/g, '$1');

  // 3. Convert \[ ... \] display math to clean block $$ ... $$
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_m, inner: string) => `\n$$\n${inner.trim()}\n$$\n`);

  // 4. Convert \( ... \) inline math to $ ... $
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_m, inner: string) => `$${inner.trim()}$`);

  // 5. Unescape mistakenly escaped \$ ... \$ when the inside clearly contains LaTeX commands or subscripts/superscripts
  text = text.replace(/\\\$([^$\n]{1,300}?)\\\$/g, (full, inner: string) => {
    if (LATEX_COMMAND_HINT.test(inner) || /[_^]\{?[\w+-]+\}?/.test(inner)) {
      return `$${inner}$`;
    }
    return full;
  });

  // 6. Dedent 4-space indented prose lines that contain LaTeX math or headings (so CommonMark doesn't make them <pre><code>)
  text = text.replace(/^( {4,})([^\n]*\$(?:[^$\n]+)\$[^\n]*)$/gm, (full, _indent: string, content: string) => {
    // Keep nested list continuations untouched if preceded by a list item; otherwise dedent
    if (/^\s*[-*+]\s|^\s*\d+[.)]\s/.test(content)) return full;
    return content;
  });

  // 7. Convert \ce{...} inside $...$ and $$...$$ to native KaTeX
  text = text.replace(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g, (mathBlock) => {
    if (!mathBlock.includes('\\ce{')) return mathBlock;
    return convertMhchemToKatex(mathBlock);
  });

  // 8. Prevent currency `$50` in the same paragraph from breaking real LaTeX `$...$` pairing
  const paragraphs = text.split(/\n{2,}/);
  const fixedParagraphs = paragraphs.map((para) => {
    const withoutDisplay = para.replace(/\$\$[\s\S]*?\$\$/g, '');
    const singleDollars = withoutDisplay.match(/(?<!\\)(?<!\$)\$(?!\$)/g) ?? [];
    if (singleDollars.length >= 3 && singleDollars.length % 2 === 1 && LATEX_COMMAND_HINT.test(para)) {
      return para.replace(/(?<!\\)\$(?=\d+(?:[.,]\d+)?(?:\s|[,.;:!?)\]]|$))/g, '\\$');
    }
    return para;
  });
  text = fixedParagraphs.join('\n\n');

  // 9. Wrap bare undelimited LaTeX expressions like (\text{Na}_2\text{CO}_3, \text{KIO}_3) or \frac{a}{b}
  //    when they appear outside of existing $...$ blocks.
  const mathSplit = text.split(/(\$\$[\s\S]*?\$\$|(?<!\\)\$[^$\n]+(?<!\\)\$)/g);
  const latexAtom =
    '(?:\\\\(?:text|mathrm|mathbf|frac|dfrac|sqrt)\\{[^{}]*\\}(?:\\{[^{}]*\\})?(?:[_^](?:\\{[^{}]*\\}|[A-Za-z0-9+-]))*)';
  const bareLatexRe = new RegExp(
    `${latexAtom}(?:(?:\\s*[,;+=\\-→⇌]\\s*|\\s*)(?:${latexAtom}|\\d+))*`,
    'g',
  );
  for (let idx = 0; idx < mathSplit.length; idx += 2) {
    let plain = mathSplit[idx];
    if (!plain.includes('\\')) continue;

    // Bare \ce{...} outside $
    plain = plain.replace(/\\ce\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, (match) => `$${convertMhchemToKatex(match)}$`);
    plain = plain.replace(bareLatexRe, (match) => `$${match.trim()}$`);

    mathSplit[idx] = plain;
  }
  text = mathSplit.join('');

  // 10. Collapse accidental newlines inside $$ ... $$ or ensure standalone block $$ has clean spacing
  text = text.replace(/([^\n])\n?\$\$([^$\n]+)\$\$([^\n]?)/g, (_m, before: string, inner: string, after: string) => {
    // If $$...$$ is used inline inside a sentence (like "Formula: $$\text{Na}_2\text{CO}_3$$ end"),
    // render cleanly as inline $...$ unless it's on its own line
    if (before.trim() && after.trim()) {
      return `${before}$${inner.trim()}$${after}`;
    }
    return `${before}\n\n$$\n${inner.trim()}\n$$\n\n${after}`;
  });

  return text;
}

/**
 * Normalize Markdown before rendering with react-markdown + remark-gfm + remark-math + rehype-katex.
 * Preserves real fenced code blocks (python, js, svg, etc.) verbatim while fixing outer ```markdown
 * wrappers, broken GFM tables, mhchem \ce{}, \(...\)/\[...\], escaped \$, and HTML <sub>/<sup>.
 */
export function normalizeMarkdownForDisplay(raw: string): string {
  if (!raw) return '';
  const unwrapped = stripOuterMarkdownFence(raw).replace(/\r\n?/g, '\n');

  // Split around real fenced code blocks so we never alter code examples or ```svg diagrams
  const lines = unwrapped.split('\n');
  const segments: { isCode: boolean; content: string }[] = [];
  let buf: string[] = [];
  let inFence = false;
  let fenceMarker = '';
  let fenceLang = '';

  const flush = (isCode: boolean) => {
    if (buf.length > 0) {
      segments.push({ isCode, content: buf.join('\n') });
      buf = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!inFence) {
      const open = trimmed.match(/^(`{3,}|~{3,})\s*([^\s`~]*)/);
      if (open) {
        flush(false);
        inFence = true;
        fenceMarker = open[1][0].repeat(open[1].length);
        fenceLang = (open[2] ?? '').toLowerCase();
        buf.push(line);
        continue;
      }
      buf.push(line);
    } else {
      buf.push(line);
      const closeRe = new RegExp(`^${fenceMarker[0]}{${fenceMarker.length},}\\s*$`);
      if (closeRe.test(trimmed)) {
        // If an inner block was tagged ```markdown or ```md, unwrap it so its tables/math render!
        if (fenceLang === 'markdown' || fenceLang === 'md') {
          const innerLines = buf.slice(1, -1);
          buf = [];
          segments.push({ isCode: false, content: innerLines.join('\n') });
        } else {
          flush(true);
        }
        inFence = false;
        fenceMarker = '';
        fenceLang = '';
      }
    }
  }
  if (buf.length > 0) {
    if (inFence && (fenceLang === 'markdown' || fenceLang === 'md')) {
      segments.push({ isCode: false, content: buf.slice(1).join('\n') });
    } else {
      flush(inFence);
    }
  }

  return segments
    .map((seg) => {
      if (seg.isCode) return seg.content;
      const withTables = normalizeTablesInSegment(seg.content);
      return normalizeMathAndInlineInSegment(withTables);
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Convert Markdown (including LaTeX chemical formulas and tables) into a clean plain-text
 * snippet suitable for cards and list previews (e.g. SubjectsView note cards).
 */
export function markdownToPlainPreview(raw: string): string {
  if (!raw) return '';
  let text = stripOuterMarkdownFence(raw);
  // Replace LaTeX math with readable plain Unicode (e.g. $\text{Na}_2\text{CO}_3$ -> Na₂CO₃)
  text = text.replace(/\$\$?([^$\n]+)\$\$?/g, (_m, inner: string) => {
    return inner
      .replace(/\\(?:text|mathrm|mathbf|mathit|ce)\{([^{}]+)\}/g, '$1')
      .replace(/\\rightarrow|\\to/g, '→')
      .replace(/\\rightleftharpoons/g, '⇌')
      .replace(/\\times/g, '×')
      .replace(/\\cdot/g, '·')
      .replace(/\\pm/g, '±')
      .replace(/_\{([^}]+)\}/g, (_s, sub: string) => toUnicodeSubscript(sub))
      .replace(/_([0-9a-zA-Z+-])/g, (_s, sub: string) => toUnicodeSubscript(sub))
      .replace(/\^\{([^}]+)\}/g, (_s, sup: string) => toUnicodeSuperscript(sup))
      .replace(/\^([0-9a-zA-Z+-])/g, (_s, sup: string) => toUnicodeSuperscript(sup))
      .replace(/\\[a-zA-Z]+/g, ' ')
      .replace(/[{}]/g, '');
  });
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*\|?(?:\s*:?-+:?\s*\|)+\s*$/gm, ' ')
    .replace(/\|/g, ' ')
    .replace(/[#*_`~>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
