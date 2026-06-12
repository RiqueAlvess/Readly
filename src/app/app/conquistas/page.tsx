"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useProfileContext } from "@/lib/hooks/profileContext";
import { useToast } from "@/lib/hooks/useToast";
import { timeAgo } from "@/lib/utils/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { FullPageSpinner } from "@/components/ui/Spinner";
import type { Badge as BadgeType, UserBadge } from "@/types";

interface BadgeRow extends BadgeType {
  earned: boolean;
  equipped: boolean;
  earned_at: string | null;
}

function conditionLabel(b: BadgeType): string {
  switch (b.condition_type) {
    case "books_read":
      return `Leia ${b.condition_value} livros`;
    case "pages_read":
      return `Leia ${b.condition_value} páginas`;
    case "xp":
      return `Alcance ${b.condition_value} XP`;
    case "streak":
      return `Mantenha uma sequência de ${b.condition_value} dias`;
    case "reviews":
      return `Escreva ${b.condition_value} resenhas`;
    case "followers":
      return `Tenha ${b.condition_value} seguidores`;
    default:
      return b.description;
  }
}

export default function ConquistasPage() {
  const supabase = getSupabaseBrowser();
  const { profile } = useProfileContext();
  const { toast } = useToast();

  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const [allRes, mineRes] = await Promise.all([
        supabase.from("badges").select("*").order("condition_value", { ascending: true }),
        supabase
          .from("user_badges")
          .select("badge_id, equipped, earned_at")
          .eq("user_id", profile.id),
      ]);
      if (allRes.error) throw allRes.error;
      if (mineRes.error) throw mineRes.error;

      const earnedMap = new Map(
        ((mineRes.data as UserBadge[]) ?? []).map((ub) => [ub.badge_id, ub])
      );

      setBadges(
        ((allRes.data as BadgeType[]) ?? []).map((b) => {
          const mine = earnedMap.get(b.id);
          return {
            ...b,
            earned: !!mine,
            equipped: mine?.equipped ?? false,
            earned_at: mine?.earned_at ?? null,
          };
        })
      );
    } catch (e: any) {
      setError(e.message || "Erro ao carregar conquistas.");
    } finally {
      setLoading(false);
    }
  }, [supabase, profile]);

  useEffect(() => {
    if (profile) load();
  }, [profile, load]);

  async function toggleEquip(b: BadgeRow) {
    if (!profile || !b.earned) return;
    setBusy(b.id);
    try {
      const { error } = await supabase
        .from("user_badges")
        .update({ equipped: !b.equipped })
        .eq("user_id", profile.id)
        .eq("badge_id", b.id);
      if (error) throw error;
      setBadges((prev) =>
        prev.map((x) => (x.id === b.id ? { ...x, equipped: !x.equipped } : x))
      );
      toast(b.equipped ? "Emblema removido." : "Emblema equipado!", "success");
    } catch (e: any) {
      toast(e.message || "Erro ao equipar.", "error");
    } finally {
      setBusy(null);
    }
  }

  if (!profile || loading) return <FullPageSpinner />;

  if (error) {
    return (
      <div className="py-10 text-center">
        <p className="mb-4 text-on-surface-muted">{error}</p>
        <Button onClick={load}>Tentar novamente</Button>
      </div>
    );
  }

  const earnedCount = badges.filter((b) => b.earned).length;
  const equippedCount = badges.filter((b) => b.equipped).length;
  const total = badges.length;
  const pct = total > 0 ? Math.round((earnedCount / total) * 100) : 0;

  return (
    <div className="space-y-5 pt-2">
      <h1 className="font-display text-2xl font-bold">Conquistas</h1>

      <Card className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">
            {earnedCount} de {total} conquistas
          </span>
          <span className="text-on-surface-muted">{equippedCount} equipada(s)</span>
        </div>
        <ProgressBar value={pct} glow />
      </Card>

      {total === 0 ? (
        <Card className="text-center text-sm text-on-surface-muted">
          Nenhuma conquista disponível ainda.
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {badges.map((b) => (
            <Card
              key={b.id}
              className={
                "relative flex flex-col items-center gap-2 text-center " +
                (b.earned ? "" : "opacity-40")
              }
            >
              {!b.earned && (
                <div className="absolute right-2 top-2 text-lg">🔒</div>
              )}
              {b.equipped && (
                <div className="absolute left-2 top-2">
                  <Badge color="#E0B341">Equipado</Badge>
                </div>
              )}
              <div className="text-4xl">{b.icon || "🏅"}</div>
              <p className="text-sm font-bold">{b.name}</p>
              <p className="text-[11px] text-on-surface-muted">
                {b.earned ? b.description : conditionLabel(b)}
              </p>
              {b.earned ? (
                <>
                  {b.earned_at && (
                    <p className="text-[10px] text-on-surface-muted">
                      Conquistado {timeAgo(b.earned_at)}
                    </p>
                  )}
                  <Button
                    size="sm"
                    fullWidth
                    variant={b.equipped ? "secondary" : "primary"}
                    loading={busy === b.id}
                    onClick={() => toggleEquip(b)}
                  >
                    {b.equipped ? "Remover" : "Equipar"}
                  </Button>
                </>
              ) : (
                <p className="text-[10px] font-semibold text-on-surface-muted">
                  Bloqueado
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
