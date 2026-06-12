"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const items = [
  { href: "/app/dashboard", label: "Início", icon: "🏠" },
  { href: "/app/estante", label: "Estante", icon: "📚" },
  { href: "/app/social", label: "Social", icon: "💬" },
  { href: "/app/store", label: "Loja", icon: "🎁" },
  { href: "/app/perfil", label: "Perfil", icon: "👤" },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg px-3 pb-[env(safe-area-inset-bottom)]">
      <div className="glass mb-2 flex items-center justify-around rounded-3xl px-2 py-2 shadow-neu">
        {items.map((it) => {
          const active = path.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-medium transition",
                active
                  ? "text-primary"
                  : "text-on-surface-muted hover:text-on-surface"
              )}
            >
              <span
                className={cn(
                  "text-xl transition-transform",
                  active && "scale-110 drop-shadow-[0_0_8px_rgba(212,168,156,0.6)]"
                )}
              >
                {it.icon}
              </span>
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
