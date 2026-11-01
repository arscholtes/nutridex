import type { Grade } from "epistasis";

// The plan's grading table: A green, B blue, C amber, D gray.
const STYLE: Record<Grade, string> = {
  A: "bg-emerald-700 text-white ring-ink",
  B: "bg-sky-700 text-white ring-ink",
  C: "bg-amber-300 text-ink ring-ink",
  D: "bg-neutral-500 text-white ring-ink",
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
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-bold ring-2 ring-inset ${STYLE[grade]}`}
      title={`Grade ${grade} · ${limitations ?? MEANING[grade]}`}
    >
      {grade}
    </span>
  );
}
