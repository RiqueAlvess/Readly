import { Sparkles } from "lucide-react";
import { formatXP } from "@/lib/utils/format";

export function XPBadge({ xp }: { xp: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1.5">
      <Sparkles size={13} className="text-primary" strokeWidth={2} />
      <span className="text-sm font-bold text-primary">{formatXP(xp)}</span>
      <span className="text-[10px] font-semibold text-primary/60">XP</span>
    </div>
  );
}
