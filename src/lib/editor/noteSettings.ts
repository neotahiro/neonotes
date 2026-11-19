import { DEFAULT_SPACING, LINE_HEIGHTS, PARAGRAPH_GAPS, WORD_GAPS, isDefaultSpacing, type Spacing } from "./spacing";

/** Settings that belong to one note. They are saved inside the note, so they follow it to every device. */
export interface NoteSettings {
  spacing: Spacing;
  /** Word target for this note, or null for none. */
  goal: number | null;
  /** Labels for finding the note again. */
  tags: string[];
}

export const DEFAULT_SETTINGS: NoteSettings = { spacing: DEFAULT_SPACING, goal: null, tags: [] };
export const MAX_TAGS = 12;
export const MAX_TAG_LENGTH = 30;

/**
 * Tidies one tag. Only letters, numbers, spaces, dots, dashes and underscores are kept. This matters because tags are
 * saved inside a hidden comment in the note, and characters like } or > could break it.
 */
export function cleanTag(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/^#+/, "")
    .replace(/[^\p{L}\p{N} _.-]/gu, "")
    .replace(/-{2,}/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TAG_LENGTH)
    .trim();
}

/** The same tag with different capital letters counts as one tag. */
export const tagKey = (tag: string): string => tag.toLocaleLowerCase();

/** Cleans a list of tags: drops empty and repeated ones (the first spelling wins) and keeps at most MAX_TAGS. */
export function normalizeTags(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    if (typeof item !== "string") continue;
    const tag = cleanTag(item);
    if (!tag || seen.has(tagKey(tag))) continue;
    seen.add(tagKey(tag));
    out.push(tag);
    if (out.length === MAX_TAGS) break;
  }
  return out;
}
export const MAX_GOAL = 1_000_000;

export function validGoal(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= MAX_GOAL ? value : null;
}

const MARKER = /^\s*<!--neonotes:(\{[^}]*\})-->/;

/** Reads a saved note's settings without copying its text. `markerLength` is how much of the start is the marker. */
export function readSettings(stored: string): { settings: NoteSettings; markerLength: number } {
  const match = MARKER.exec(stored);
  if (!match) return { settings: DEFAULT_SETTINGS, markerLength: 0 };
  let raw: Record<string, unknown> = {};
  try { raw = JSON.parse(match[1]) as Record<string, unknown>; } catch { /* use the defaults */ }
  const pick = (value: unknown, list: number[], fallback: number) => (typeof value === "number" && list.includes(value) ? value : fallback);
  return {
    markerLength: match[0].length,
    settings: {
      spacing: {
        lineHeight: pick(raw.lh, LINE_HEIGHTS, DEFAULT_SPACING.lineHeight),
        paragraph: pick(raw.ps, PARAGRAPH_GAPS, DEFAULT_SPACING.paragraph),
        word: pick(raw.ws, WORD_GAPS, DEFAULT_SPACING.word),
      },
      goal: validGoal(raw.goal),
      tags: normalizeTags(raw.tags),
    },
  };
}

/** Separates a saved note into its text (HTML) and its settings. Missing or unknown values fall back to the defaults. */
export function splitSettings(stored: string): { html: string; settings: NoteSettings } {
  const { settings, markerLength } = readSettings(stored);
  return { html: markerLength ? stored.slice(markerLength) : stored, settings };
}

/** Just the tags of a saved note. */
export const tagsOf = (stored: string): string[] => readSettings(stored).settings.tags;

/** Puts the settings back in front of the note's HTML. A note with all-default settings carries no marker at all. */
export function joinSettings(html: string, settings: NoteSettings): string {
  if (isDefaultSpacing(settings.spacing) && settings.goal === null && settings.tags.length === 0) return html;
  const data: Record<string, number> = {
    lh: settings.spacing.lineHeight,
    ps: settings.spacing.paragraph,
    ws: settings.spacing.word,
  };
  const body: Record<string, unknown> = { ...data };
  if (settings.goal !== null) body.goal = settings.goal;
  if (settings.tags.length) body.tags = normalizeTags(settings.tags);
  return `<!--neonotes:${JSON.stringify(body)}-->${html}`;
}

/** Changes some settings of a saved note without touching its text. */
export function updateSettings(stored: string, patch: Partial<NoteSettings>): string {
  const { html, settings } = splitSettings(stored);
  return joinSettings(html, { ...settings, ...patch });
}
