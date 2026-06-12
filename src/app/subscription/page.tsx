"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const PLANS = [
  { id: "mensal", name: "Mensal", price: "R$ 14,90", period: "/mês", highlight: false },
  { id: "semestral", name: "Semestral", price: "R$ 69,90", period: "/6 meses", highlight: true, save: "Economize 22%" },
  { id: "anual", name: "Anual", price: "R$ 119,90", period: "/ano", highlight: false, save: "Economize 33%" },
];

export default function SubscriptionPage() {
  const [selected, setSelected] = useState("semestral");

  function checkout() {
    const base = process.env.NEXT_PUBLIC_KIWIFY_CHECKOUT_URL || "#";
    window.location.href = `${base}?plan=${selected}`;
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-12">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/15 text-4xl shadow-glow">
          👑
        </div>
        <h1 className="font-display text-3xl font-bold">Renove seu Readly</h1>
        <p className="mt-2 text-sm text-on-surface-muted">
          Sua assinatura expirou. Escolha um plano para continuar lendo, ganhando
          XP e participando da comunidade.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        {PLANS.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            className={
              "relative flex items-center justify-between rounded-2xl p-4 text-left transition " +
              (selected === p.id
                ? "bg-primary/15 ring-2 ring-primary shadow-glow"
                : "neu-card")
            }
          >
            <div>
              <p className="font-display text-lg font-bold">{p.name}</p>
              {p.save && (
                <span className="text-xs font-semibold text-primary">{p.save}</span>
              )}
            </div>
            <div className="text-right">
              <p className="text-xl font-bold">{p.price}</p>
              <p className="text-xs text-on-surface-muted">{p.period}</p>
            </div>
            {p.highlight && (
              <span className="absolute -top-2 right-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-on-primary">
                POPULAR
              </span>
            )}
          </button>
        ))}
      </div>

      <Card glass className="mt-6 text-sm text-on-surface-muted">
        <p className="mb-2 font-semibold text-on-surface">Incluído em todos os planos:</p>
        <ul className="space-y-1">
          <li>✅ Estante e diário de leitura ilimitados</li>
          <li>✅ XP, ranks e conquistas</li>
          <li>✅ Loja gacha + marketplace</li>
          <li>✅ Campeonatos e feed social</li>
        </ul>
      </Card>

      <Button fullWidth size="lg" className="mt-6" onClick={checkout}>
        Assinar {PLANS.find((p) => p.id === selected)?.name}
      </Button>
      <p className="mt-3 text-center text-xs text-on-surface-muted">
        Pagamento processado via Kiwify. Cancele quando quiser.
      </p>
    </main>
  );
}
