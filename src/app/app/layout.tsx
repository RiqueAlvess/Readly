"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { BottomNav } from "@/components/layout/BottomNav";
import { TopBar } from "@/components/layout/TopBar";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { useProfile } from "@/lib/hooks/useProfile";
import { useOnline } from "@/lib/hooks/useOnline";
import { useDailyLogin } from "@/lib/hooks/useDailyLogin";
import { ProfileContext } from "@/lib/hooks/profileContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { profile, loading, reload, setProfile } = useProfile();
  const online = useOnline();
  const [authed, setAuthed] = useState<boolean | null>(null); // null = checking
  const timedOut = useRef(false);

  // Safety timeout — never hang more than 6s
  useEffect(() => {
    const t = setTimeout(() => {
      timedOut.current = true;
      // Force re-render so the spinner clears
      setAuthed((prev) => (prev === null ? false : prev));
    }, 6000);
    return () => clearTimeout(t);
  }, []);

  useDailyLogin(profile?.id);

  // Auth check
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/login");
      } else {
        setAuthed(true);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.replace("/login");
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  // Subscription gate — only block expired/inactive, never null/trial
  useEffect(() => {
    if (!profile) return;
    const blocked =
      profile.subscription_status === "expired" ||
      profile.subscription_status === "inactive";
    if (blocked) router.replace("/subscription");
  }, [profile, router]);

  const ready = authed === true && !loading;
  const showAnyway = timedOut.current; // safety valve

  if (!ready && !showAnyway) return <FullPageSpinner />;

  return (
    <ProfileContext.Provider value={{ profile, reload, setProfile }}>
      <div className="mx-auto min-h-screen max-w-lg px-4 pb-28 pt-2">
        {!online && (
          <div className="mb-2 rounded-xl bg-amber-900/50 px-3 py-2 text-center text-xs text-amber-100">
            Você está offline — alterações serão sincronizadas depois.
          </div>
        )}
        <TopBar profile={profile} />
        {children}
      </div>
      <BottomNav />
    </ProfileContext.Provider>
  );
}
