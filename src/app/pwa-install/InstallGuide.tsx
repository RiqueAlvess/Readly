"use client";

import { useEffect, useState } from "react";
import { detectOS, type DeviceOS } from "@/lib/utils/pwa";

const STEPS: Record<DeviceOS, { icon: string; text: string }[]> = {
  android: [
    { icon: "⋮", text: "Toque nos 3 pontos no canto do navegador" },
    { icon: "➕", text: "Escolha “Adicionar à tela inicial”" },
    { icon: "✅", text: "Confirme e abra o Readly pela tela inicial" },
  ],
  ios: [
    { icon: "􀈂", text: "Toque no ícone de Compartilhar (quadrado com seta)" },
    { icon: "➕", text: "Escolha “Adicionar à Tela de Início”" },
    { icon: "✅", text: "Confirme e abra o Readly pela tela de início" },
  ],
  other: [
    { icon: "⬇️", text: "Abra este site no Chrome ou Safari do seu celular" },
    { icon: "➕", text: "Use o menu do navegador para instalar o app" },
    { icon: "✅", text: "Abra o Readly pela tela inicial" },
  ],
};

export default function InstallGuide() {
  const [os, setOS] = useState<DeviceOS>("other");
  useEffect(() => setOS(detectOS()), []);

  const steps = STEPS[os];
  const label =
    os === "ios" ? "iPhone / iPad" : os === "android" ? "Android" : "Seu dispositivo";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 animate-pulse-glow items-center justify-center rounded-3xl bg-primary/15 text-5xl">
          📚
        </div>
        <h1 className="font-display text-4xl font-bold">Readly</h1>
        <p className="mt-2 text-on-surface-muted">
          Sua estante social, gamificada. Instale o app para começar a ganhar XP.
        </p>

        <div className="mt-8 rounded-2xl bg-surface p-2 shadow-neu">
          <div className="rounded-xl bg-primary/10 py-2 text-sm font-semibold text-primary">
            Como instalar no {label}
          </div>
          <div className="mt-2 flex flex-col gap-2 p-2 text-left">
            {steps.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl bg-surface-light/50 p-3"
              >
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary text-on-primary font-bold">
                  {i + 1}
                </span>
                <span className="text-sm">{s.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-2">
          {["Estante", "XP & Ranks", "Gacha"].map((f) => (
            <div
              key={f}
              className="rounded-2xl bg-surface p-3 text-xs text-on-surface-muted shadow-neu-sm"
            >
              <div className="mb-1 text-2xl">
                {f === "Estante" ? "📖" : f === "Gacha" ? "🎁" : "✨"}
              </div>
              {f}
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs text-on-surface-muted">
          O Readly funciona melhor instalado: tela cheia, offline e notificações.
        </p>
      </div>
    </main>
  );
}
