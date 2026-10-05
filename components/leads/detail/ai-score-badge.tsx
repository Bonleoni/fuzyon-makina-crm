import { cn } from "@/lib/utils";

/** AI skor rozeti — 1-10 ölçeği */
export function AiScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 8
      ? "bg-emerald-100 text-emerald-800"
      : score >= 5
        ? "bg-amber-100 text-amber-800"
        : "bg-rose-100 text-rose-800";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
        tone
      )}
    >
      AI {score}/10
    </span>
  );
}
