import type { Grade } from "epistasis";

// The plan's grading table: A green, B blue, C amber, D gray.
const STYLE: Record<Grade, string> = {
  A: "bg-emerald-500/20 text-emerald-300 ring-emerald-400/40",
  B: "bg-sky-500/20 text-sky-300 ring-sky-400/40",
  C: "bg-amber-500/20 text-amber-300 ring-amber-400/40",
  D: "bg-neutral-500/20 text-neutral-300 ring-neutral-400/40",
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
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ring-1 ring-inset ${STYLE[grade]}`}
      title={`Grade ${grade} · ${limitations ?? MEANING[grade]}`}
    >
      {grade}
    </span>
  );
}
