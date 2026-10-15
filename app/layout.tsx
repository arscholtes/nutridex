import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DisclaimerGate } from "./disclaimer-gate.tsx";
import "./globals.css";

export const metadata: Metadata = {
  title: "Foodi Dex",
  description: "What is in your food, what it does, and what helps it work.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        <DisclaimerGate>{children}</DisclaimerGate>
      </body>
    </html>
  );
}
