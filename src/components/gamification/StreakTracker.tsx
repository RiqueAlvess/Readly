"use client";

import { cn } from "@/lib/utils/cn";

interface Props {
  current: number;
  longest?: number;
  lastActivityDate?: string | null;
}

const DAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

export function StreakTracker({ current, longest }: Props) {
  // Reconstruct which of the last 7 weekday-dots are "lit" based on streak count.
  const today = new Date().getDay(); // 0=Sun
  const lit: boolean[] = [];
  for (let i = 0; i < 7; i++) {
    const dayOffsetFromToday = today - i; // i=0 -> today
    lit[today - i < 0 ? today - i + 7 : today - i] = false;
  }
  // simpler: light the last `current` days up to 7
  const litDays = new Set<number>();
  for (let i = 0; i < Math.min(current, 7); i++) {
    let d = today - i;
    if (d < 0) d += 7;
    litDays.add(d);
  }

  return (
    <div className="neu-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="animate-flame text-2xl">🔥</span>
          <div>
            <p className="font-display text-xl font-bold">{current} dias</p>
            <p className="text-xs text-on-surface-muted">Sequência atual</p>
          </div>
        </div>
        {longest !== undefined && (
          <span className="text-xs text-on-surface-muted">
            Recorde: <span className="font-bold text-primary">{longest}</span>
          </span>
        )}
      </div>
      <div className="flex justify-between">
        {DAYS.map((label, idx) => {
          const on = litDays.has(idx);
          return (
            <div key={idx} className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-sm transition",
                  on
                    ? "bg-primary text-on-primary shadow-glow"
                    : "neu-inset text-on-surface-muted"
                )}
              >
                {on ? "🔥" : ""}
              </div>
              <span className="text-[10px] text-on-surface-muted">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
