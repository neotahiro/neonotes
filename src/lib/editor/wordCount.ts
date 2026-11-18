/** Counts words in plain text. Words are runs of characters separated by any whitespace. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}
