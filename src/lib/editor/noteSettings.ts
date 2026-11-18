import { DEFAULT_SPACING, LINE_HEIGHTS, PARAGRAPH_GAPS, WORD_GAPS, isDefaultSpacing, type Spacing } from "./spacing";

/** Settings that belong to one note. They are saved inside the note, so they follow it to every device. */
export interface NoteSettings {
  spacing: Spacing;
  /** Word target for this note, or null for none. */
  goal: number | null;
}

export const DEFAULT_SETTINGS: NoteSettings = { spacing: DEFAULT_SPACING, goal: null };
export const MAX_GOAL = 1_000_000;

export function validGoal(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= MAX_GOAL ? value : null;
}

const MARKER = /^\s*<!--neonotes:(\{[^}]*\})-->/;

/** Separates a saved note into its text (HTML) and its settings. Missing or unknown values fall back to the defaults. */
export function splitSettings(stored: string): { html: string; settings: NoteSettings } {
  const match = MARKER.exec(stored);
  if (!match) return { html: stored, settings: DEFAULT_SETTINGS };
  let raw: Record<string, unknown> = {};
  try { raw = JSON.parse(match[1]) as Record<string, unknown>; } catch { /* use the defaults */ }
  const pick = (value: unknown, list: number[], fallback: number) => (typeof value === "number" && list.includes(value) ? value : fallback);
  return {
    html: stored.slice(match[0].length),
    settings: {
      spacing: {
        lineHeight: pick(raw.lh, LINE_HEIGHTS, DEFAULT_SPACING.lineHeight),
        paragraph: pick(raw.ps, PARAGRAPH_GAPS, DEFAULT_SPACING.paragraph),
        word: pick(raw.ws, WORD_GAPS, DEFAULT_SPACING.word),
      },
      goal: validGoal(raw.goal),
    },
  };
}

/** Puts the settings back in front of the note's HTML. A note with all-default settings carries no marker at all. */
export function joinSettings(html: string, settings: NoteSettings): string {
  if (isDefaultSpacing(settings.spacing) && settings.goal === null) return html;
  const data: Record<string, number> = {
    lh: settings.spacing.lineHeight,
    ps: settings.spacing.paragraph,
    ws: settings.spacing.word,
  };
  if (settings.goal !== null) data.goal = settings.goal;
  return `<!--neonotes:${JSON.stringify(data)}-->${html}`;
}

/** Changes some settings of a saved note without touching its text. */
export function updateSettings(stored: string, patch: Partial<NoteSettings>): string {
  const { html, settings } = splitSettings(stored);
  return joinSettings(html, { ...settings, ...patch });
}
