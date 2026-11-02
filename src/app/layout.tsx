import type { Metadata, Viewport } from "next";
import "@fontsource/instrument-sans/400.css";
import "@fontsource/instrument-sans/500.css";
import "@fontsource/instrument-sans/600.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "./globals.css";
import { TouchActive } from "@/components/client";
import { publicGroup } from "./(public)/group";

/** Titles the app "<group name> Rostering"; falls back to plain "Rostering" with no group or no database. */
export async function generateMetadata(): Promise<Metadata> {
  let name: string | null = null;
  try {
    name = (await publicGroup())?.name?.trim() || null;
  } catch {
    name = null;
  }
  const brand = name ? `${name} Rostering` : "Rostering";
  return {
    title: { default: brand, template: `%s · ${brand}` },
    description: "Who's serving on Friday, what's still open, and the songs.",
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#141518" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <TouchActive />
        {children}
      </body>
    </html>
  );
}
