"use client";

import { useEffect } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { awardXP } from "@/lib/gamification";

// Awards daily-login XP and updates the streak once per calendar day.
export function useDailyLogin(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;
    const today = new Date().toISOString().slice(0, 10);
    const key = `readly_login_${userId}`;
    if (localStorage.getItem(key) === today) return;

    (async () => {
      const supabase = getSupabaseBrowser();
      const { data: streak } = await supabase
        .from("streaks")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      const last = streak?.last_activity_date as string | null;
      let current = streak?.current_streak ?? 0;
      const longest = streak?.longest_streak ?? 0;

      const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      if (last === today) {
        // already counted today
      } else if (last === yesterday) {
        current += 1;
      } else {
        current = 1;
      }
      const newLongest = Math.max(longest, current);

      await supabase.from("streaks").upsert({
        user_id: userId,
        current_streak: current,
        longest_streak: newLongest,
        last_activity_date: today,
      });

      await awardXP(supabase as any, userId, "daily_login");
      if (current > 0 && current % 7 === 0) {
        await awardXP(supabase as any, userId, "streak_7day");
      }
      localStorage.setItem(key, today);
    })();
  }, [userId]);
}
