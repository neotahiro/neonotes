import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NeoNotes — Your writing space",
  description: "A calm, personal space for notes and writing.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
