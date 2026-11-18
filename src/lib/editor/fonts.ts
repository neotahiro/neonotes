/** The writing fonts on offer. To add one, load it in src/app/fonts.ts and list it here. */
export interface WritingFont {
  label: string;
  /** What is saved in the note. It points at the font variable set up in src/app/fonts.ts. */
  css: string;
  group: "Serif" | "Sans" | "Handwriting";
}

export const FONTS: WritingFont[] = [
  { label: "Literata", css: "var(--font-serif)", group: "Serif" },
  { label: "Lora", css: "var(--font-lora)", group: "Serif" },
  { label: "Merriweather", css: "var(--font-merriweather)", group: "Serif" },
  { label: "EB Garamond", css: "var(--font-garamond)", group: "Serif" },
  { label: "Playfair Display", css: "var(--font-playfair)", group: "Serif" },
  { label: "Figtree", css: "var(--font-sans)", group: "Sans" },
  { label: "Inter", css: "var(--font-inter)", group: "Sans" },
  { label: "Nunito", css: "var(--font-nunito)", group: "Sans" },
  { label: "Caveat", css: "var(--font-caveat)", group: "Handwriting" },
  { label: "Dancing Script", css: "var(--font-dancing)", group: "Handwriting" },
];

export const FONT_GROUPS = ["Serif", "Sans", "Handwriting"] as const;
