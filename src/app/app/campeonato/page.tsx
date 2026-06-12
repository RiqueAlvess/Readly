"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useProfileContext } from "@/lib/hooks/profileContext";
import { useToast } from "@/lib/hooks/useToast";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { FullPageSpinner } from "@/components/ui/Spinner";
import type { Championship, ChampionshipParticipant } from "@/types";

type Status = "active" | "upcoming" | "ended";

function statusOf(c: Championship, now: number): Status {
  const start = new Date(c.start_date).getTime();
  const end = new Date(c.end_date).getTime();
  if (now < start) return "upcoming";
  if (now > end) return "ended";
  return "active";
}

interface PartRow extends Omit<ChampionshipParticipant, "profile"> {
  profile?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export default function CampeonatoPage() {
  const supabase = getSupabaseBrowser();
  const { profile } = useProfileContext();
  const { toast } = useToast();

  const [championships, setChampionships] = useState<Championship[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<PartRow[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const now = useMemo(() => Date.now(), []);

  const loadList = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const [champRes, joinedRes] = await Promise.all([
        supabase
          .from("championships")
          .select("*")
          .order("start_date", { ascending: false }),
        supabase
          .from("championship_participants")
          .select("championship_id")
          .eq("user_id", profile.id),
      ]);
      if (champRes.error) throw champRes.error;
      if (joinedRes.error) throw joinedRes.error;

      const champs = (champRes.data as Championship[]) ?? [];
      setChampionships(champs);
      setJoinedIds(
        new Set((joinedRes.data ?? []).map((r) => r.championship_id))
      );

      // default selection: first active, else first
      const active = champs.find((c) => statusOf(c, now) === "active");
      setSelectedId((prev) => prev ?? active?.id ?? champs[0]?.id ?? null);
    } catch (e: any) {
      setError(e.message || "Erro ao carregar campeonatos.");
    } finally {
      setLoading(false);
    }
  }, [supabase, profile, now]);

  const loadBoard = useCallback(
    async (champId: string) => {
      setLoadingBoard(true);
      try {
        const { data, error } = await supabase
          .from("championship_participants")
          .select("*, profile:profiles(id, full_name, avatar_url)")
          .eq("championship_id", champId)
          .order("score", { ascending: false });
        if (error) throw error;
        setParticipants((data as PartRow[]) ?? []);
      } catch (e: any) {
        toast(e.message || "Erro ao carregar ranking.", "error");
        setParticipants([]);
      } finally {
        setLoadingBoard(false);
      }
    },
    [supabase, toast]
  );

  useEffect(() => {
    if (profile) loadList();
  }, [profile, loadList]);

  useEffect(() => {
    if (selectedId) loadBoard(selectedId);
  }, [selectedId, loadBoard]);

  async function join(c: Championship) {
    if (!profile) return;
    setJoining(true);
    try {
      const { error } = await supabase.from("championship_participants").insert({
        championship_id: c.id,
        user_id: profile.id,
        score: 0,
      });
      if (error) throw error;
      setJoinedIds((prev) => new Set(prev).add(c.id));
      toast("Você entrou no campeonato!", "success");
      if (selectedId === c.id) await loadBoard(c.id);
    } catch (e: any) {
      toast(e.message || "Erro ao participar.", "error");
    } finally {
      setJoining(false);
    }
  }

  if (!profile || loading) return <FullPageSpinner />;

  if (error) {
    return (
      <div className="py-10 text-center">
        <p className="mb-4 text-on-surface-muted">{error}</p>
        <Button onClick={loadList}>Tentar novamente</Button>
      </div>
    );
  }

  const grouped: Record<Status, Championship[]> = {
    active: [],
    upcoming: [],
    ended: [],
  };
  for (const c of championships) grouped[statusOf(c, now)].push(c);

  const selected = championships.find((c) => c.id === selectedId) ?? null;
  const myEntry = participants.find((p) => p.user_id === profile.id);

  const sections: { key: Status; label: string; emoji: string }[] = [
    { key: "active", label: "Ativos", emoji: "🔥" },
    { key: "upcoming", label: "Em breve", emoji: "⏳" },
    { key: "ended", label: "Encerrados", emoji: "🏁" },
  ];

  return (
    <div className="space-y-6 pt-2">
      <h1 className="font-display text-2xl font-bold">Campeonatos</h1>

      {championships.length === 0 && (
        <Card className="text-center text-sm text-on-surface-muted">
          Nenhum campeonato disponível ainda.
        </Card>
      )}

      {sections.map(({ key, label, emoji }) =>
        grouped[key].length === 0 ? null : (
          <section key={key} className="space-y-2">
            <h2 className="font-display text-lg font-bold">
              {emoji} {label}
            </h2>
            {grouped[key].map((c) => {
              const joined = joinedIds.has(c.id);
              const isSelected = c.id === selectedId;
              return (
                <Card
                  key={c.id}
                  className={
                    "space-y-2 " + (isSelected ? "ring-2 ring-primary/50" : "")
                  }
                >
                  <button
                    className="w-full text-left"
                    onClick={() => setSelectedId(c.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold">{c.title}</p>
                        {c.description && (
                          <p className="text-xs text-on-surface-muted">
                            {c.description}
                          </p>
                        )}
                      </div>
                      {joined && <Badge color="#8FB98F">Inscrito</Badge>}
                    </div>
                  </button>

                  {key === "active" && c.prize_description && (
                    <div className="rounded-xl bg-surface-light p-2 text-sm">
                      🏆 <span className="font-semibold">Prêmio:</span>{" "}
                      {c.prize_description}
                    </div>
                  )}

                  {key === "active" &&
                    (joined ? (
                      <p className="text-xs text-on-surface-muted">
                        Sua pontuação:{" "}
                        <span className="font-bold text-primary">
                          {myEntry && selectedId === c.id ? myEntry.score : "—"}
                        </span>
                      </p>
                    ) : (
                      <Button
                        size="sm"
                        loading={joining}
                        onClick={() => join(c)}
                      >
                        Participar
                      </Button>
                    ))}
                </Card>
              );
            })}
          </section>
        )
      )}

      {/* Leaderboard for selected */}
      {selected && (
        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">
            Ranking · {selected.title}
          </h2>
          {loadingBoard ? (
            <Card className="text-center text-sm text-on-surface-muted">
              Carregando ranking...
            </Card>
          ) : participants.length === 0 ? (
            <Card className="text-center text-sm text-on-surface-muted">
              Nenhum participante ainda. Seja o primeiro!
            </Card>
          ) : (
            <Card className="space-y-1 p-2">
              {participants.map((p, i) => {
                const isMe = p.user_id === profile.id;
                return (
                  <div
                    key={p.user_id}
                    className={
                      "flex items-center gap-3 rounded-xl px-2 py-2 " +
                      (isMe ? "bg-primary/15" : "")
                    }
                  >
                    <span className="w-6 text-center font-display font-bold text-on-surface-muted">
                      {i + 1}
                    </span>
                    <Avatar
                      src={p.profile?.avatar_url}
                      name={p.profile?.full_name}
                      size={32}
                    />
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {p.profile?.full_name || "Leitor"} {isMe && "(você)"}
                    </p>
                    <span className="text-sm font-bold text-primary">
                      {p.score} pts
                    </span>
                  </div>
                );
              })}
            </Card>
          )}
        </section>
      )}
    </div>
  );
}
