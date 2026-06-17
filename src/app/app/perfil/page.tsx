"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useProfileContext } from "@/lib/hooks/profileContext";
import { useToast } from "@/lib/hooks/useToast";
import { getRankForXP, rankProgress } from "@/lib/constants";
import { formatXP } from "@/lib/utils/format";
import { BookCheck, FileText, Star, PenLine } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { Avatar } from "@/components/ui/Avatar";
import { XPBadge } from "@/components/gamification/XPBadge";
import { StreakTracker } from "@/components/gamification/StreakTracker";
import { ShareCardShell } from "@/components/sharing/ShareCardShell";
import { RankCard } from "@/components/sharing/RankCard";
import { StreakCard } from "@/components/sharing/StreakCard";
import { cn } from "@/lib/utils/cn";
import type { Badge as BadgeType, UserBadge } from "@/types";

interface StreakRow {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
}

interface Stats {
  booksRead: number;
  pagesRead: number;
  avgRating: number | null;
  notes: number;
}

export default function PerfilPage() {
  const supabase = getSupabaseBrowser();
  const { profile, reload } = useProfileContext();
  const { toast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState<StreakRow>({
    current_streak: 0,
    longest_streak: 0,
    last_activity_date: null,
  });
  const [stats, setStats] = useState<Stats>({
    booksRead: 0,
    pagesRead: 0,
    avgRating: null,
    notes: 0,
  });
  const [allBadges, setAllBadges] = useState<BadgeType[]>([]);
  const [earned, setEarned] = useState<Map<string, UserBadge>>(new Map());

  // modals
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalValue, setGoalValue] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [badgeBusy, setBadgeBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const uid = profile.id;
      const [
        streakRes,
        booksReadRes,
        pagesRes,
        reviewsRes,
        notesRes,
        allBadgesRes,
        userBadgesRes,
      ] = await Promise.all([
        supabase
          .from("streaks")
          .select("current_streak, longest_streak, last_activity_date")
          .eq("user_id", uid)
          .maybeSingle(),
        supabase
          .from("user_books")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid)
          .eq("status", "read"),
        supabase.from("user_books").select("pages_read").eq("user_id", uid),
        supabase.from("book_reviews").select("rating").eq("user_id", uid),
        supabase
          .from("diary_entries")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid),
        supabase.from("badges").select("*").order("condition_value", { ascending: true }),
        supabase.from("user_badges").select("*, badge:badges(*)").eq("user_id", uid),
      ]);

      if (streakRes.data) setStreak(streakRes.data as StreakRow);

      const pagesRead = (pagesRes.data ?? []).reduce(
        (sum: number, r: any) => sum + (r.pages_read ?? 0),
        0
      );
      const ratings = (reviewsRes.data ?? []).map((r: any) => r.rating as number);
      const avgRating =
        ratings.length > 0
          ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length
          : null;

      setStats({
        booksRead: booksReadRes.count ?? 0,
        pagesRead,
        avgRating,
        notes: notesRes.count ?? 0,
      });

      setAllBadges((allBadgesRes.data ?? []) as BadgeType[]);
      const map = new Map<string, UserBadge>();
      for (const ub of (userBadgesRes.data ?? []) as UserBadge[]) {
        map.set(ub.badge_id, ub);
      }
      setEarned(map);
    } catch (e: any) {
      toast(e?.message ?? "Erro ao carregar perfil", "error");
    } finally {
      setLoading(false);
    }
  }, [profile, supabase, toast]);

  useEffect(() => {
    if (profile) load();
  }, [profile, load]);

  async function toggleEquip(badge: BadgeType) {
    if (!profile) return;
    const ub = earned.get(badge.id);
    if (!ub || badgeBusy) return;
    setBadgeBusy(badge.id);
    const next = !ub.equipped;
    // optimistic
    setEarned((prev) => {
      const m = new Map(prev);
      m.set(badge.id, { ...ub, equipped: next });
      return m;
    });
    try {
      const { error } = await supabase
        .from("user_badges")
        .update({ equipped: next })
        .eq("user_id", profile.id)
        .eq("badge_id", badge.id);
      if (error) throw error;
      toast(next ? "Emblema equipado" : "Emblema removido", "success");
    } catch (e: any) {
      // revert
      setEarned((prev) => {
        const m = new Map(prev);
        m.set(badge.id, ub);
        return m;
      });
      toast(e?.message ?? "Erro ao atualizar emblema", "error");
    } finally {
      setBadgeBusy(null);
    }
  }

  async function saveGoal() {
    if (!profile) return;
    const n = parseInt(goalValue, 10);
    if (!Number.isFinite(n) || n < 0) {
      toast("Informe um número válido", "info");
      return;
    }
    setSavingGoal(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ annual_goal: n })
        .eq("id", profile.id);
      if (error) throw error;
      await reload();
      toast("Meta atualizada!", "success");
      setGoalOpen(false);
    } catch (e: any) {
      toast(e?.message ?? "Erro ao salvar meta", "error");
    } finally {
      setSavingGoal(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      router.replace("/login");
    } catch (e: any) {
      toast(e?.message ?? "Erro ao sair", "error");
      setLoggingOut(false);
    }
  }

  if (!profile || loading) return <FullPageSpinner />;

  const rank = getRankForXP(profile.xp);
  const progress = rankProgress(profile.xp);
  const name = profile.full_name ?? profile.username ?? "Leitor";

  const subLabels: Record<string, string> = {
    active: "Ativa",
    inactive: "Inativa",
    expired: "Expirada",
    trial: "Teste",
  };
  const expiresLabel = profile.subscription_expires_at
    ? new Date(profile.subscription_expires_at).toLocaleDateString("pt-BR")
    : null;

  return (
    <div className="space-y-4 pb-28">
      {/* header */}
      <Card className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar src={profile.avatar_url} name={name} size={72} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-2xl font-bold">{name}</h1>
            {profile.username && (
              <p className="truncate text-sm text-on-surface-muted">
                @{profile.username}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1 text-sm font-bold"
                style={{ color: rank.color }}
              >
                {rank.emoji} {rank.name}
              </span>
              <XPBadge xp={profile.xp} />
            </div>
          </div>
        </div>

        {/* xp progress */}
        <div className="space-y-1.5">
          <ProgressBar value={progress.pct} glow />
          <p className="text-xs text-on-surface-muted">
            {progress.next ? (
              <>
                {formatXP(progress.next.minXP - profile.xp)} XP para{" "}
                <span style={{ color: progress.next.color }} className="font-semibold">
                  {progress.next.emoji} {progress.next.name}
                </span>
              </>
            ) : (
              <span className="font-semibold text-primary">
                Rank máximo alcançado! 👑
              </span>
            )}
          </p>
        </div>
      </Card>

      {/* streak */}
      <StreakTracker current={streak.current_streak} longest={streak.longest_streak} />

      {/* stats bento */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="text-center">
          <div className="flex justify-center mb-1">
            <BookCheck size={28} className="text-primary" strokeWidth={1.5} />
          </div>
          <div className="font-display text-2xl font-bold">{stats.booksRead}</div>
          <div className="text-xs text-on-surface-muted">Livros lidos</div>
        </Card>
        <Card className="text-center">
          <div className="flex justify-center mb-1">
            <FileText size={28} className="text-primary" strokeWidth={1.5} />
          </div>
          <div className="font-display text-2xl font-bold">
            {formatXP(stats.pagesRead)}
          </div>
          <div className="text-xs text-on-surface-muted">Páginas lidas</div>
        </Card>
        <Card className="text-center">
          <div className="flex justify-center mb-1">
            <Star size={28} className="text-primary" strokeWidth={1.5} />
          </div>
          <div className="font-display text-2xl font-bold">
            {stats.avgRating != null ? stats.avgRating.toFixed(1) : "—"}
          </div>
          <div className="text-xs text-on-surface-muted">Nota média</div>
        </Card>
        <Card className="text-center">
          <div className="flex justify-center mb-1">
            <PenLine size={28} className="text-primary" strokeWidth={1.5} />
          </div>
          <div className="font-display text-2xl font-bold">{stats.notes}</div>
          <div className="text-xs text-on-surface-muted">Anotações</div>
        </Card>
      </div>

      {/* badges */}
      <Card className="space-y-3">
        <h2 className="font-display text-lg font-bold">Emblemas</h2>
        {allBadges.length === 0 ? (
          <p className="text-sm text-on-surface-muted">Nenhum emblema disponível.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {allBadges.map((b) => {
              const ub = earned.get(b.id);
              const unlocked = !!ub;
              return (
                <button
                  key={b.id}
                  type="button"
                  disabled={!unlocked || badgeBusy === b.id}
                  onClick={() => toggleEquip(b)}
                  title={b.description}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-2xl p-3 text-center transition",
                    unlocked ? "neu-inset active:scale-95" : "opacity-40",
                    ub?.equipped && "ring-2 ring-primary"
                  )}
                >
                  <span className="text-2xl">{unlocked ? b.icon : "🔒"}</span>
                  <span className="line-clamp-2 text-[11px] font-semibold text-on-surface">
                    {b.name}
                  </span>
                  {ub?.equipped && (
                    <span className="text-[10px] font-bold text-primary">Equipado</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* annual goal */}
      <Card className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-on-surface-muted">
            Meta anual
          </p>
          <p className="font-display text-2xl font-bold">
            {profile.annual_goal} <span className="text-base font-normal">livros</span>
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setGoalValue(String(profile.annual_goal));
            setGoalOpen(true);
          }}
        >
          Editar
        </Button>
      </Card>

      {/* subscription */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-on-surface-muted">
              Assinatura
            </p>
            <p className="font-display text-lg font-bold">
              {subLabels[profile.subscription_status] ?? profile.subscription_status}
            </p>
            {expiresLabel && (
              <p className="text-xs text-on-surface-muted">
                Válida até {expiresLabel}
              </p>
            )}
          </div>
          <span className="text-2xl">💳</span>
        </div>
        <Link href="/subscription">
          <Button variant="secondary" fullWidth>
            Gerenciar assinatura
          </Button>
        </Link>
      </Card>

      {/* share */}
      <Button variant="secondary" fullWidth onClick={() => setShareOpen(true)}>
        📤 Compartilhar perfil
      </Button>

      {/* admin */}
      {profile.is_admin && (
        <Link href="/admin">
          <Button variant="ghost" fullWidth>
            🛠️ Painel de administração
          </Button>
        </Link>
      )}

      {/* logout */}
      <Button
        variant="danger"
        fullWidth
        loading={loggingOut}
        onClick={handleLogout}
      >
        Sair da conta
      </Button>

      {/* goal modal */}
      <Modal open={goalOpen} onClose={() => setGoalOpen(false)} title="Meta anual de leitura">
        <div className="space-y-4">
          <label className="block text-sm text-on-surface-muted">
            Quantos livros você quer ler este ano?
          </label>
          <input
            type="number"
            min={0}
            value={goalValue}
            onChange={(e) => setGoalValue(e.target.value)}
            className="w-full rounded-2xl bg-surface-light px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <Button fullWidth loading={savingGoal} onClick={saveGoal}>
            Salvar meta
          </Button>
        </div>
      </Modal>

      {/* share modal */}
      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Compartilhar">
        <div className="space-y-6">
          <ShareCardShell fileName="readly-rank.png">
            <RankCard xp={profile.xp} name={name} />
          </ShareCardShell>
          <ShareCardShell fileName="readly-streak.png">
            <StreakCard current={streak.current_streak} name={name} />
          </ShareCardShell>
        </div>
      </Modal>
    </div>
  );
}
