"use client";

import { useEffect, useState, useCallback } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { Profile } from "@/types";

export function useProfile() {
  const supabase = getSupabaseBrowser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setProfile(data as Profile);
        setLoading(false);
        return;
      }

      // Profile row doesn't exist yet — create it (handles cases where
      // the DB trigger didn't fire or migration wasn't run)
      const username = user.email?.split("@")[0] ?? `user_${user.id.slice(0, 6)}`;
      const full_name = user.user_metadata?.full_name ?? username;

      const { data: created, error: createErr } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          username,
          full_name,
          avatar_url: user.user_metadata?.avatar_url ?? null,
          xp: 0,
          rank: "calouro",
          credits: 100,
          subscription_status: "trial",
          annual_goal: 12,
          monthly_book_limit: 5,
          monthly_books_purchased: 0,
          is_admin: false,
        })
        .select()
        .single();

      if (!createErr && created) {
        // Also ensure streak row exists
        await supabase
          .from("streaks")
          .upsert({ user_id: user.id })
          .eq("user_id", user.id);

        setProfile(created as Profile);
      } else {
        // Even if upsert failed (RLS?), don't hang — use a minimal local profile
        setProfile({
          id: user.id,
          username,
          full_name,
          avatar_url: null,
          bio: null,
          xp: 0,
          rank: "calouro",
          credits: 100,
          subscription_status: "trial",
          subscription_expires_at: null,
          annual_goal: 12,
          monthly_book_limit: 5,
          monthly_books_purchased: 0,
          is_admin: false,
          created_at: new Date().toISOString(),
        });
      }
    } catch {
      // Never hang the app — silently fail
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  return { profile, loading, reload: load, setProfile };
}
