import type { Metadata, Viewport } from "next";
import { fontClassNames } from "./fonts";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";


export const metadata: Metadata = {
  title: "NeoNotes",
  description: "A quiet place to write.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0B1220", interactiveWidget: "resizes-content" };

// Runs before paint so the saved theme never flashes.
const themeScript = `try{var t=localStorage.getItem('noenotes-theme');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={fontClassNames}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
