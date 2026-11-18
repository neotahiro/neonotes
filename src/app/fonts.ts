import {
  Caveat, Dancing_Script, EB_Garamond, Figtree, Inter, Literata, Lora, Merriweather, Nunito, Playfair_Display,
} from "next/font/google";

// Next.js needs every option written out in full here, so please don't share options between fonts.
// The interface and the default writing font load straight away.
const sans = Figtree({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Literata({ subsets: ["latin"], variable: "--font-serif", display: "swap" });

// The extra writing fonts download only when a note actually uses them (preload: false).
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap", style: ["normal", "italic"], preload: false });
const merriweather = Merriweather({ subsets: ["latin"], variable: "--font-merriweather", display: "swap", style: ["normal", "italic"], preload: false });
const garamond = EB_Garamond({ subsets: ["latin"], variable: "--font-garamond", display: "swap", style: ["normal", "italic"], preload: false });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap", style: ["normal", "italic"], preload: false });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap", preload: false });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap", preload: false });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap", preload: false });
const dancing = Dancing_Script({ subsets: ["latin"], variable: "--font-dancing", display: "swap", preload: false });

export const fontClassNames = [
  sans, serif, lora, merriweather, garamond, playfair, inter, nunito, caveat, dancing,
].map((f) => f.variable).join(" ");
