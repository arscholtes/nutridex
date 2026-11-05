"use client";

import { useRouter } from "next/navigation";
import { useRef, type ReactNode } from "react";

const MIN_SWIPE_PX = 70;
const MORE_SIDEWAYS_THAN_UP = 1.5;

/**
 * Where a finger's movement leads.
 * @param dx [number] how far it moved sideways, negative to the left
 * @param dy [number] how far it moved up or down
 * @param prev [string | null] the previous entry's address
 * @param next [string | null] the next entry's address
 * @return [string | null] the address to go to, or null when it was not a swipe
 */
export function swipeTarget(dx: number, dy: number, prev: string | null, next: string | null): string | null {
  if (Math.abs(dx) < MIN_SWIPE_PX || Math.abs(dx) < Math.abs(dy) * MORE_SIDEWAYS_THAN_UP) return null;
  return dx < 0 ? next : prev;
}

/** Moves between entries when a finger swipes sideways anywhere on the screen. */
export function SwipeSteps({ prev, next, children }: { prev: string | null; next: string | null; children: ReactNode }) {
  const router = useRouter();
  const start = useRef<{ x: number; y: number } | null>(null);
  return (
    <div
      className="contents"
      onTouchStart={(e) => {
        start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }}
      onTouchEnd={(e) => {
        if (!start.current) return;
        const target = swipeTarget(e.changedTouches[0].clientX - start.current.x, e.changedTouches[0].clientY - start.current.y, prev, next);
        start.current = null;
        if (target) router.push(target);
      }}
    >
      {children}
    </div>
  );
}
