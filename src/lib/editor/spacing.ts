/** Spacing for the whole note. It is saved inside the note, so it follows the note to every device. */
export interface Spacing {
  /** Space between lines, as a multiple of the text size. */
  lineHeight: number;
  /** Gap between paragraphs, in em. */
  paragraph: number;
  /** Extra space between words, in em. */
  word: number;
}

export const DEFAULT_SPACING: Spacing = { lineHeight: 1.75, paragraph: 1.1, word: 0 };

export const LINE_HEIGHTS = [1.2, 1.4, 1.6, 1.75, 2, 2.4, 3];
export const PARAGRAPH_GAPS = [0, 0.4, 0.75, 1.1, 1.5, 2, 3];
export const WORD_GAPS = [-0.05, 0, 0.05, 0.1, 0.2, 0.3, 0.5];

export function isDefaultSpacing(s: Spacing): boolean {
  return s.lineHeight === DEFAULT_SPACING.lineHeight && s.paragraph === DEFAULT_SPACING.paragraph && s.word === DEFAULT_SPACING.word;
}

/** Moves to the next (1) or previous (-1) value in the list. Stays put at either end. */
export function stepValue(list: number[], current: number, direction: 1 | -1): number {
  const i = list.indexOf(current);
  if (i === -1) return direction === 1 ? (list.find((v) => v > current) ?? current) : ([...list].reverse().find((v) => v < current) ?? current);
  return list[Math.min(list.length - 1, Math.max(0, i + direction))];
}

const MARKER = /^\s*<!--neonotes:(\{[^}]*\})-->/;

/** Separates a saved note into its text (HTML) and its spacing. Unknown or missing values fall back to the defaults. */
export function splitSpacing(stored: string): { html: string; spacing: Spacing } {
  const match = MARKER.exec(stored);
  if (!match) return { html: stored, spacing: DEFAULT_SPACING };
  let raw: Record<string, unknown> = {};
  try { raw = JSON.parse(match[1]) as Record<string, unknown>; } catch { /* use the defaults */ }
  const pick = (value: unknown, list: number[], fallback: number) => (typeof value === "number" && list.includes(value) ? value : fallback);
  return {
    html: stored.slice(match[0].length),
    spacing: {
      lineHeight: pick(raw.lh, LINE_HEIGHTS, DEFAULT_SPACING.lineHeight),
      paragraph: pick(raw.ps, PARAGRAPH_GAPS, DEFAULT_SPACING.paragraph),
      word: pick(raw.ws, WORD_GAPS, DEFAULT_SPACING.word),
    },
  };
}

/** Puts the spacing back in front of the note's HTML. Notes with the default spacing carry no marker at all. */
export function joinSpacing(html: string, spacing: Spacing): string {
  if (isDefaultSpacing(spacing)) return html;
  return `<!--neonotes:${JSON.stringify({ lh: spacing.lineHeight, ps: spacing.paragraph, ws: spacing.word })}-->${html}`;
}
