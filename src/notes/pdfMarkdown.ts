export interface PdfTextRun {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
  hasEOL?: boolean;
}

interface PositionedRun {
  text: string;
  x: number;
  y: number;
  width: number;
  size: number;
}

export interface PdfFigure {
  id: string;
  image: string;
  top: number;
}

const escapeText = (text: string) => text.replace(/[\\`*_{}\[\]<>|#~]/g, '\\$&');

export function pageMarkdown(
  items: PdfTextRun[],
  viewport: { convertToViewportPoint(x: number, y: number): number[] },
  figures: PdfFigure[],
) {
  const runs: PositionedRun[] = [];
  for (const item of items) {
    if (!item.str?.trim() || !item.transform) continue;
    const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
    runs.push({ text: item.str.trim(), x, y, width: item.width ?? 0, size: item.height || 10 });
  }
  runs.sort((a, b) => a.y - b.y || a.x - b.x);
  const sizes = runs.map(run => run.size).sort((a, b) => a - b);
  const fontSize = sizes[Math.floor(sizes.length / 2)] || 10;
  const lines: { y: number; runs: PositionedRun[] }[] = [];
  for (const run of runs) {
    const line = lines.at(-1);
    if (line && run.y - line.y <= Math.max(2, fontSize / 4)) line.runs.push(run);
    else lines.push({ y: run.y, runs: [run] });
  }
  const rows = lines.map(line => {
    const cells: { x: number; end: number; text: string }[] = [];
    for (const run of line.runs.sort((a, b) => a.x - b.x)) {
      const previous = cells.at(-1);
      if (!previous || run.x - previous.end > Math.max(12, fontSize * 1.5)) {
        cells.push({ x: run.x, end: run.x + run.width, text: run.text });
      } else {
        previous.text += (run.x - previous.end >= fontSize * .15 ? ' ' : '') + run.text;
        previous.end = Math.max(previous.end, run.x + run.width);
      }
    }
    return { y: line.y, size: Math.max(...line.runs.map(run => run.size)), cells };
  });
  const output: { y: number; markdown: string }[] = [];
  for (let index = 0; index < rows.length;) {
    const row = rows[index];
    const table = [row];
    if (row.cells.length >= 2) {
      for (const next of rows.slice(index + 1)) {
        const previous = table.at(-1)!;
        if (next.y - previous.y > fontSize * 3 ||
          next.cells.length !== row.cells.length ||
          !next.cells.every((cell, column) => Math.abs(cell.x - row.cells[column].x) < fontSize)) break;
        table.push(next);
      }
    }
    if (table.length >= 3) {
      const format = (cells: string[]) => '| ' + cells.join(' | ') + ' |';
      output.push({ y: row.y, markdown: [
        format(row.cells.map(cell => escapeText(cell.text))),
        format(row.cells.map(() => '---')),
        ...table.slice(1).map(line => format(line.cells.map(cell => escapeText(cell.text)))),
      ].join('\n') });
      index += table.length;
    } else {
      const heading = row.size >= fontSize * 1.35 && row.cells.length === 1;
      const raw = row.cells.map(cell => escapeText(cell.text)).join('  ');
      output.push({ y: row.y, markdown: heading ? '### ' + raw : raw });
      index++;
    }
  }
  for (const [index, figure] of figures.entries()) {
    output.push({ y: figure.top, markdown: `![Figure ${index + 1}](${figure.id})` });
  }
  return output.sort((a, b) => a.y - b.y).map(item => item.markdown).join('\n\n');
}
