"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isStandalone } from "@/lib/utils/pwa";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui/Spinner";
import InstallGuide from "./pwa-install/InstallGuide";

export default function RootPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"loading" | "install">("loading");

  useEffect(() => {
    if (isStandalone()) {
      // Running as installed PWA: route by auth state.
      const supabase = getSupabaseBrowser();
      supabase.auth.getSession().then(({ data }) => {
        router.replace(data.session ? "/app/dashboard" : "/login");
      });
    } else {
      setMode("install");
    }
  }, [router]);

  if (mode === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return <InstallGuide />;
}
