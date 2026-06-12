import { cn } from "@/lib/utils/cn";

interface Props {
  children: React.ReactNode;
  color?: string;
  className?: string;
}

export function Badge({ children, color, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        !color && "bg-primary/20 text-primary",
        className
      )}
      style={
        color
          ? { backgroundColor: `${color}22`, color }
          : undefined
      }
    >
      {children}
    </span>
  );
}
