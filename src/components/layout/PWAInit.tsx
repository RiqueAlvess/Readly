"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/utils/pwa";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { flushQueue } from "@/lib/utils/offline-queue";

// Registers the service worker and wires up the background-sync message handler.
export function PWAInit() {
  useEffect(() => {
    registerServiceWorker();
    if ("serviceWorker" in navigator) {
      const handler = (event: MessageEvent) => {
        if (event.data?.type === "FLUSH_QUEUE") {
          flushQueue(getSupabaseBrowser() as any);
        }
      };
      navigator.serviceWorker.addEventListener("message", handler);
      return () =>
        navigator.serviceWorker.removeEventListener("message", handler);
    }
  }, []);
  return null;
}
