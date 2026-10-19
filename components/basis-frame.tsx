import type { ReactNode } from "react";
import type { Basis } from "epistasis";

/**
 * Frames a claim by its basis. A by-class claim is dashed and striped and says which class it rests
 * on; a measured one is solid. Both say so in words, so the difference never rests on colour alone.
 * @param basis [Basis] measured, or by-class
 * @param className [string | null] the ChEBI class a by-class claim rests on
 */
export function BasisFrame({ basis, className, children }: { basis: Basis; className: string | null; children: ReactNode }) {
  if (basis === "by-class") {
    return (
      <div
        data-basis="by-class"
        className="rounded-xl border-2 border-dashed border-amber-400/70 bg-[repeating-linear-gradient(135deg,transparent_0_10px,rgb(251_191_36/0.08)_10px_20px)] p-4"
      >
        {children}
        <p
          className="mt-2 text-xs font-semibold uppercase tracking-wide text-amber-300"
          title={`Its source measured other members of ChEBI's ${className} class, not this compound`}
        >
          {`By class: ${className}`}
        </p>
      </div>
    );
  }
  return (
    <div data-basis="measured" className="rounded-xl border border-solid border-neutral-800 bg-neutral-900 p-4">
      {children}
      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Measured</p>
    </div>
  );
}
