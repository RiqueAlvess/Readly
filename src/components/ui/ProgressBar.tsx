import { cn } from "@/lib/utils/cn";

interface Props {
  value: number; // 0-100
  className?: string;
  barClassName?: string;
  glow?: boolean;
}

export function ProgressBar({ value, className, barClassName, glow }: Props) {
  return (
    <div
      className={cn(
        "h-2.5 w-full overflow-hidden rounded-full bg-white/10",
        className
      )}
    >
      <div
        className={cn(
          "h-full rounded-full bg-primary transition-all duration-700 ease-out",
          glow && "shadow-glow",
          barClassName
        )}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
