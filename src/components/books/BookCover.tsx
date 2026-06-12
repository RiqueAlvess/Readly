import { cn } from "@/lib/utils/cn";

interface Props {
  url?: string | null;
  title: string;
  author?: string;
  className?: string;
}

// Renders a book cover; falls back to a generated gradient spine with title.
export function BookCover({ url, title, author, className }: Props) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt={title}
        className={cn(
          "aspect-[2/3] w-full rounded-xl object-cover shadow-neu-sm",
          className
        )}
      />
    );
  }
  // deterministic hue from title
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return (
    <div
      className={cn(
        "flex aspect-[2/3] w-full flex-col justify-between rounded-xl p-2.5 shadow-neu-sm",
        className
      )}
      style={{
        background: `linear-gradient(150deg, hsl(${hue} 30% 28%), hsl(${(hue + 40) % 360} 35% 18%))`,
      }}
    >
      <span className="line-clamp-4 font-display text-xs font-bold leading-tight text-on-background/90">
        {title}
      </span>
      {author && (
        <span className="line-clamp-1 text-[10px] text-on-background/60">{author}</span>
      )}
    </div>
  );
}
