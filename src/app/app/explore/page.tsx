"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useProfileContext } from "@/lib/hooks/profileContext";
import { useToast } from "@/lib/hooks/useToast";
import { getRankForXP } from "@/lib/constants";
import { formatXP } from "@/lib/utils/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { BookCover } from "@/components/books/BookCover";
import type { Book, Profile, Championship } from "@/types";

interface SuggestedReader extends Profile {
  is_following: boolean;
}

export default function ExplorePage() {
  const supabase = getSupabaseBrowser();
  const { profile } = useProfileContext();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [trending, setTrending] = useState<Book[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedReader[]>([]);
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [leaderboard, setLeaderboard] = useState<Profile[]>([]);
  const [followBusy, setFollowBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const nowIso = new Date().toISOString();
      const [trendRes, sugRes, champRes, lbRes, followRes] = await Promise.all([
        supabase
          .from("books")
          .select("*")
          .order("rating_avg", { ascending: false })
          .limit(8),
        supabase
          .from("profiles")
          .select("*")
          .neq("id", profile.id)
          .order("xp", { ascending: false })
          .limit(6),
        supabase
          .from("championships")
          .select("*")
          .lte("start_date", nowIso)
          .gte("end_date", nowIso)
          .order("end_date", { ascending: true }),
        supabase
          .from("profiles")
          .select("*")
          .order("xp", { ascending: false })
          .limit(10),
        supabase.from("follows").select("following_id").eq("follower_id", profile.id),
      ]);

      if (trendRes.error) throw trendRes.error;
      if (sugRes.error) throw sugRes.error;
      if (champRes.error) throw champRes.error;
      if (lbRes.error) throw lbRes.error;
      if (followRes.error) throw followRes.error;

      const followingIds = new Set(
        (followRes.data ?? []).map((f) => f.following_id)
      );

      setTrending((trendRes.data as Book[]) ?? []);
      setSuggestions(
        ((sugRes.data as Profile[]) ?? []).map((p) => ({
          ...p,
          is_following: followingIds.has(p.id),
        }))
      );
      setChampionships((champRes.data as Championship[]) ?? []);
      setLeaderboard((lbRes.data as Profile[]) ?? []);
    } catch (e: any) {
      setError(e.message || "Erro ao carregar a página de exploração.");
    } finally {
      setLoading(false);
    }
  }, [supabase, profile]);

  useEffect(() => {
    if (profile) load();
  }, [profile, load]);

  async function toggleFollow(reader: SuggestedReader) {
    if (!profile) return;
    setFollowBusy(reader.id);
    try {
      if (reader.is_following) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", profile.id)
          .eq("following_id", reader.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("follows").insert({
          follower_id: profile.id,
          following_id: reader.id,
        });
        if (error) throw error;
      }
      setSuggestions((prev) =>
        prev.map((p) =>
          p.id === reader.id ? { ...p, is_following: !p.is_following } : p
        )
      );
    } catch (e: any) {
      toast(e.message || "Erro ao seguir.", "error");
    } finally {
      setFollowBusy(null);
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

  return (
    <div className="space-y-7 pt-2">
      <h1 className="font-display text-2xl font-bold">Explorar</h1>

      {/* Trending */}
      <section>
        <h2 className="mb-2 font-display text-lg font-bold">📈 Em alta</h2>
        {trending.length === 0 ? (
          <Card className="text-center text-sm text-on-surface-muted">
            Nenhum livro em destaque ainda.
          </Card>
        ) : (
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
            {trending.map((b) => (
              <Link key={b.id} href={`/app/livro/${b.id}`} className="w-28 shrink-0">
                <BookCover url={b.cover_url} title={b.title} author={b.author} />
                <p className="mt-1 truncate text-xs font-semibold">{b.title}</p>
                <p className="text-[11px] text-on-surface-muted">
                  ⭐ {b.rating_avg.toFixed(1)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Reader suggestions */}
      <section>
        <h2 className="mb-2 font-display text-lg font-bold">👥 Leitores para seguir</h2>
        {suggestions.length === 0 ? (
          <Card className="text-center text-sm text-on-surface-muted">
            Nenhuma sugestão no momento.
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {suggestions.map((r) => {
              const rank = getRankForXP(r.xp);
              return (
                <Card key={r.id} className="flex flex-col items-center gap-2 text-center">
                  <Avatar src={r.avatar_url} name={r.full_name} size={48} />
                  <div>
                    <p className="truncate text-sm font-bold">
                      {r.full_name || "Leitor"}
                    </p>
                    <Badge color={rank.color}>
                      {rank.emoji} {rank.name}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    fullWidth
                    variant={r.is_following ? "secondary" : "primary"}
                    loading={followBusy === r.id}
                    onClick={() => toggleFollow(r)}
                  >
                    {r.is_following ? "Seguindo" : "Seguir"}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Active championships */}
      <section>
        <h2 className="mb-2 font-display text-lg font-bold">🏆 Campeonatos ativos</h2>
        {championships.length === 0 ? (
          <Card className="text-center text-sm text-on-surface-muted">
            Nenhum campeonato ativo agora.
          </Card>
        ) : (
          <div className="space-y-2">
            {championships.map((c) => (
              <Link key={c.id} href="/app/campeonato">
                <Card className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{c.title}</p>
                    {c.prize_description && (
                      <p className="truncate text-xs text-on-surface-muted">
                        🏅 {c.prize_description}
                      </p>
                    )}
                  </div>
                  <span className="text-on-surface-muted">›</span>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Leaderboard */}
      <section>
        <h2 className="mb-2 font-display text-lg font-bold">🥇 Top leitores</h2>
        {leaderboard.length === 0 ? (
          <Card className="text-center text-sm text-on-surface-muted">
            Sem dados de ranking ainda.
          </Card>
        ) : (
          <Card className="space-y-1 p-2">
            {leaderboard.map((p, i) => {
              const rank = getRankForXP(p.xp);
              const isMe = p.id === profile.id;
              return (
                <div
                  key={p.id}
                  className={
                    "flex items-center gap-3 rounded-xl px-2 py-2 " +
                    (isMe ? "bg-primary/15" : "")
                  }
                >
                  <span className="w-6 text-center font-display font-bold text-on-surface-muted">
                    {i + 1}
                  </span>
                  <Avatar src={p.avatar_url} name={p.full_name} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {p.full_name || "Leitor"} {isMe && "(você)"}
                    </p>
                    <p className="text-[11px] text-on-surface-muted">
                      {rank.emoji} {rank.name}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-primary">
                    {formatXP(p.xp)} XP
                  </span>
                </div>
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}
