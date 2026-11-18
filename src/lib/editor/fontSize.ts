/** Font sizes are shown in pixels (16 is the normal text size) but saved as "em", so zoom scales them. */
export const SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64] as const;
export const DEFAULT_SIZE = 16;

export function sizeToEm(px: number): string {
  return `${+(px / DEFAULT_SIZE).toFixed(3)}em`;
}

/** Reads a saved size back to pixels. Anything that isn't a sensible "em" value gives null. */
export function emToPx(em: string | null | undefined): number | null {
  const match = /^(\d*\.?\d+)em$/.exec((em ?? "").trim());
  if (!match) return null;
  const px = Math.round(parseFloat(match[1]) * DEFAULT_SIZE);
  return px >= 6 && px <= 200 ? px : null;
}

/** The next size up (direction 1) or down (direction -1) from the list. Stays put at either end. */
export function stepSize(current: number, direction: 1 | -1): number {
  if (direction === 1) return SIZES.find((s) => s > current) ?? current;
  return [...SIZES].reverse().find((s) => s < current) ?? current;
}
