import { cleanTag, normalizeTags, tagKey, MAX_TAGS } from "@/lib/editor/noteSettings";

export interface TagCount {
  name: string;
  count: number;
}

/** Every tag used anywhere, with how many notes use it. Capital letters are ignored; the most common spelling is shown. */
export function collectTags(perNote: Iterable<string[]>): TagCount[] {
  const groups = new Map<string, { spellings: Map<string, number>; count: number }>();
  for (const tags of perNote) {
    for (const tag of tags) {
      const key = tagKey(tag);
      const g = groups.get(key) ?? { spellings: new Map(), count: 0 };
      g.count++;
      g.spellings.set(tag, (g.spellings.get(tag) ?? 0) + 1);
      groups.set(key, g);
    }
  }
  return [...groups.values()]
    .map((g) => ({
      name: [...g.spellings.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0],
      count: g.count,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export const hasTag = (tags: string[], tag: string): boolean => tags.some((t) => tagKey(t) === tagKey(tag));

/** Adds a tag (typed by a person) to a note's tags. Returns the same list if it is empty, a repeat, or the note is full. */
export function addTag(tags: string[], raw: string): string[] {
  const tag = cleanTag(raw);
  if (!tag || hasTag(tags, tag) || tags.length >= MAX_TAGS) return tags;
  return normalizeTags([...tags, tag]);
}

export const removeTag = (tags: string[], tag: string): string[] => tags.filter((t) => tagKey(t) !== tagKey(tag));
