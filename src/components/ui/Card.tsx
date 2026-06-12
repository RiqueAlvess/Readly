import React from "react";
import { cn } from "@/lib/utils/cn";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  inset?: boolean;
}

export function Card({ glass, inset, className, children, ...rest }: Props) {
  return (
    <div
      className={cn(
        "rounded-2xl p-4",
        glass ? "glass" : inset ? "neu-inset" : "neu-card",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
