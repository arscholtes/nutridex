import type { Metadata } from "next";
import { Archivo, Fredoka, IBM_Plex_Mono, Newsreader, Sora, VT323, Zilla_Slab } from "next/font/google";
import type { CSSProperties, ReactNode } from "react";
import { skinAttributes, skinOf, skinVariables } from "../lib/skins.ts";
import { currentSkin } from "../lib/viewer.ts";
import { DisclaimerGate } from "./disclaimer-gate.tsx";
import "./globals.css";
import "./skin-treatments.css";
import "./skin-new-age.css";
import "./skin-yellow.css";

const text = Fredoka({ subsets: ["latin"], variable: "--font-fredoka" });
const readout = VT323({ weight: "400", subsets: ["latin"], variable: "--font-vt323" });
// Each of these is only fetched by the browser when a worn skin sets text in it.
const label = Archivo({ subsets: ["latin"], variable: "--font-archivo", preload: false });
const guide = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", preload: false });
const packet = Zilla_Slab({ weight: ["500", "700"], subsets: ["latin"], variable: "--font-zilla", preload: false });
const deep = Sora({ subsets: ["latin"], variable: "--font-sora", preload: false });
const till = IBM_Plex_Mono({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-plex-mono", preload: false });
const FONTS = [text, readout, label, guide, packet, deep, till].map((f) => f.variable).join(" ");

export const metadata: Metadata = {
  title: "NutriDex",
  description: "What is in your food, what it does, and what helps it work.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { skin } = await currentSkin();
  const worn = skinOf(skin);
  return (
    <html lang="en" className={FONTS} style={skinVariables(worn) as CSSProperties} {...skinAttributes(worn)}>
      <body className="font-sans text-ink antialiased">
        <DisclaimerGate>{children}</DisclaimerGate>
      </body>
    </html>
  );
}
