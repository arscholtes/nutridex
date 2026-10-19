import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
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
        <DisclaimerGate>
          <nav className="border-b border-neutral-900">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
              <Link href="/" className="font-black tracking-tight">
                Foodi Dex
              </Link>
              <Link href="/sources" className="text-sm text-neutral-400 hover:text-neutral-100">
                Sources
              </Link>
            </div>
          </nav>
          {children}
        </DisclaimerGate>
      </body>
    </html>
  );
}
