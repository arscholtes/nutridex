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
        className="rounded-xl border-2 border-dashed border-amber-600 bg-[repeating-linear-gradient(135deg,transparent_0_10px,rgb(217_119_6/0.12)_10px_20px)] p-3"
      >
        {children}
        <p
          className="dex-by-class mt-2 text-xs font-bold text-amber-900"
          title={`Its source measured other members of ChEBI's ${className} class, not this compound`}
        >
          {`By class: ${className}`}
        </p>
      </div>
    );
  }
  return (
    <div data-basis="measured" className="rounded-xl border-2 border-solid border-line bg-card p-3">
      {children}
      <p className="mt-2 text-xs font-bold text-ink-soft">Measured</p>
    </div>
  );
}
