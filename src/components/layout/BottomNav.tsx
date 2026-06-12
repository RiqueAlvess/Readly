"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, BookOpen, Users, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const items = [
  { href: "/app/dashboard", label: "Início",   Icon: House },
  { href: "/app/estante",   label: "Estante",  Icon: BookOpen },
  { href: "/app/social",    label: "Social",   Icon: Users },
  { href: "/app/store",     label: "Loja",     Icon: ShoppingBag },
  { href: "/app/perfil",    label: "Perfil",   Icon: User },
];

export function BottomNav() {
  const path = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[env(safe-area-inset-bottom)]">
      <div
        className="mb-3 flex w-full max-w-lg items-center justify-around rounded-[28px] px-2 py-2"
        style={{
          background: "rgba(25, 38, 30, 0.92)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
        }}
      >
        {items.map(({ href, label, Icon }) => {
          const active = path === href || (href !== "/app/dashboard" && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-semibold tracking-wide transition-all duration-200",
                active ? "text-primary" : "text-white/40 hover:text-white/70"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-xl transition-all duration-200",
                  active && "bg-primary/15"
                )}
              >
                <Icon
                  size={18}
                  strokeWidth={active ? 2.5 : 1.8}
                  className={active ? "text-primary" : ""}
                />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
