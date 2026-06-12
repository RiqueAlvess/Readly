"use client";

import React, { createContext, useContext, useCallback, useState } from "react";

type ToastKind = "success" | "error" | "info" | "xp";
interface ToastItem {
  id: string;
  message: string;
  kind: ToastKind;
}

interface ToastCtx {
  toast: (message: string, kind?: ToastKind) => void;
}

const Ctx = createContext<ToastCtx>({ toast: () => {} });

export function useToast() {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = Math.random().toString(36).slice(2);
    setItems((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div
            key={t.id}
            className={
              "pointer-events-auto w-full max-w-sm animate-fade-in rounded-2xl px-4 py-3 text-sm font-medium shadow-neu backdrop-blur " +
              (t.kind === "success"
                ? "bg-emerald-900/90 text-emerald-100"
                : t.kind === "error"
                ? "bg-red-900/90 text-red-100"
                : t.kind === "xp"
                ? "bg-primary/90 text-on-primary"
                : "bg-surface-light/90 text-on-surface")
            }
          >
            {t.kind === "xp" && "✨ "}
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
