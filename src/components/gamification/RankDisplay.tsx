import { rankProgress } from "@/lib/constants";
import { formatXP } from "@/lib/utils/format";
import { ProgressBar } from "@/components/ui/ProgressBar";

export function RankDisplay({ xp }: { xp: number }) {
  const { current, next, pct } = rankProgress(xp);
  return (
    <div className="neu-card flex flex-col gap-3 p-5">
      <div className="flex items-center gap-4">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-glow"
          style={{ backgroundColor: `${current.color}22` }}
        >
          {current.emoji}
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wide text-on-surface-muted">
            Seu rank
          </p>
          <p
            className="font-display text-2xl font-bold"
            style={{ color: current.color }}
          >
            {current.name}
          </p>
        </div>
      </div>
      {next ? (
        <>
          <ProgressBar value={pct} glow />
          <p className="text-xs text-on-surface-muted">
            {formatXP(next.minXP - xp)} XP para{" "}
            <span style={{ color: next.color }} className="font-semibold">
              {next.emoji} {next.name}
            </span>
          </p>
        </>
      ) : (
        <p className="text-xs font-semibold text-primary">
          Rank máximo alcançado! 👑
        </p>
      )}
    </div>
  );
}
