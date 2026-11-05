import type { Grade } from "epistasis";

// The plan's grading table: A green, B blue, C amber, D gray.
const STYLE: Record<Grade, string> = {
  A: "bg-emerald-700 text-white",
  B: "bg-sky-700 text-white",
  C: "bg-amber-300 text-neutral-900",
  D: "bg-neutral-500 text-white",
};

const MEANING: Record<Grade, string> = {
  A: "Consistent human trials",
  B: "Some human evidence",
  C: "Mechanistic only",
  D: "Traditional or anecdotal",
};

/**
 * A claim's evidence grade, with its source's limitations on hover.
 * @param grade [Grade] A to D
 * @param limitations [string | null] the source's limitations, when one is on file
 */
export function GradeBadge({ grade, limitations }: { grade: Grade; limitations: string | null }) {
  return (
    <span
      className={`dex-grade inline-flex h-5.5 min-w-5.5 items-center justify-center px-1 text-xs font-bold ${STYLE[grade]}`}
      title={`Grade ${grade} · ${limitations ?? MEANING[grade]}`}
    >
      {grade}
    </span>
  );
}
