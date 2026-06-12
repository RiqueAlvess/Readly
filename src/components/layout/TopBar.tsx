"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { XPBadge } from "@/components/gamification/XPBadge";
import type { Profile } from "@/types";

export function TopBar({ profile }: { profile: Profile | null }) {
  return (
    <header className="sticky top-0 z-30 -mx-4 mb-4 flex items-center justify-between bg-background/80 px-4 py-3 backdrop-blur-xl">
      <Link href="/app/perfil">
        <Avatar src={profile?.avatar_url} name={profile?.full_name} size={40} />
      </Link>
      <Link href="/app/dashboard" className="font-display text-2xl font-bold tracking-tight">
        Readly
      </Link>
      <XPBadge xp={profile?.xp ?? 0} />
    </header>
  );
}
