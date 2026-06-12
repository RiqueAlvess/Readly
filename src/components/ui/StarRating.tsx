"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

interface Props {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

export function StarRating({ value, onChange, readonly, size = "md" }: Props) {
  const [hover, setHover] = useState(0);
  const display = hover || value;
  const sizes = { sm: "text-base", md: "text-2xl", lg: "text-3xl" };

  return (
    <div className={cn("flex gap-1", sizes[size])}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          onClick={() => !readonly && onChange?.(star)}
          className={cn(
            "transition-transform",
            !readonly && "hover:scale-110 active:scale-95",
            star <= display ? "text-primary" : "text-white/15"
          )}
          aria-label={`${star} estrelas`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
