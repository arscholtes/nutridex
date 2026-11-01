import type { Metadata } from "next";
import { Fredoka, VT323 } from "next/font/google";
import type { ReactNode } from "react";
import { DisclaimerGate } from "./disclaimer-gate.tsx";
import "./globals.css";

const text = Fredoka({ subsets: ["latin"], variable: "--font-fredoka" });
const readout = VT323({ weight: "400", subsets: ["latin"], variable: "--font-vt323" });

export const metadata: Metadata = {
  title: "Foodi Dex",
  description: "What is in your food, what it does, and what helps it work.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${text.variable} ${readout.variable}`}>
      <body className="bg-shell-body font-sans text-ink antialiased">
        <DisclaimerGate>{children}</DisclaimerGate>
      </body>
    </html>
  );
}
