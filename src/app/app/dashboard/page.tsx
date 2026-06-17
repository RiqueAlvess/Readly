"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useProfileContext } from "@/lib/hooks/profileContext";
import { useToast } from "@/lib/hooks/useToast";
import { awardXP } from "@/lib/gamification";
import { GENRES } from "@/lib/constants";
import { progressPct } from "@/lib/utils/format";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { Avatar } from "@/components/ui/Avatar";
import { BookOpen, Shuffle, Trophy, Search, Award, FolderOpen, Heart } from "lucide-react";
import { BookCover } from "@/components/books/BookCover";
import { StreakTracker } from "@/components/gamification/StreakTracker";
import { RankDisplay } from "@/components/gamification/RankDisplay";
import type { UserBook, Post } from "@/types";

interface StreakRow {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
}

type FeedPost = Post & {
  author?: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

export default function DashboardPage() {
  const supabase = getSupabaseBrowser();
  const { profile, reload } = useProfileContext();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState<StreakRow | null>(null);
  const [readCount, setReadCount] = useState(0);
  const [readBooks, setReadBooks] = useState<UserBook[]>([]);
  const [reading, setReading] = useState<UserBook | null>(null);
  const [pagesRead, setPagesRead] = useState(0);
  const [savingPages, setSavingPages] = useState(false);
  const [marking, setMarking] = useState(false);
  const [wantToRead, setWantToRead] = useState<UserBook[]>([]);
  const [drawn, setDrawn] = useState<UserBook | null>(null);
  const [starting, setStarting] = useState(false);
  const [feed, setFeed] = useState<FeedPost[]>([]);

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [streakRes, readRes, readingRes, wantRes, feedRes] = await Promise.all([
        supabase
          .from("streaks")
          .select("current_streak, longest_streak, last_activity_date")
          .eq("user_id", profile.id)
          .maybeSingle(),
        supabase
          .from("user_books")
          .select("*, book:books(*)")
          .eq("user_id", profile.id)
          .eq("status", "read"),
        supabase
          .from("user_books")
          .select("*, book:books(*)")
          .eq("user_id", profile.id)
          .eq("status", "reading")
          .order("started_at", { ascending: false }),
        supabase
          .from("user_books")
          .select("*, book:books(*)")
          .eq("user_id", profile.id)
          .eq("status", "want_to_read"),
        supabase
          .from("posts")
          .select("*, author:profiles(*)")
          .order("created_at", { ascending: false })
          .limit(3),
      ]);

      setStreak((streakRes.data as StreakRow | null) ?? null);

      const reads = (readRes.data as UserBook[]) ?? [];
      setReadBooks(reads);
      setReadCount(reads.length);

      const readingList = (readingRes.data as UserBook[]) ?? [];
      const first = readingList[0] ?? null;
      setReading(first);
      setPagesRead(first?.pages_read ?? 0);

      setWantToRead((wantRes.data as UserBook[]) ?? []);
      setFeed((feedRes.data as FeedPost[]) ?? []);
    } catch (e) {
      console.error(e);
      toast("Erro ao carregar o painel.", "error");
    } finally {
      setLoading(false);
    }
  }, [profile, supabase, toast]);

  useEffect(() => {
    if (profile) loadData();
  }, [profile, loadData]);

  // Debounced persistence of pages_read
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commitPages = useCallback(
    async (value: number) => {
      if (!profile || !reading) return;
      const prev = reading.pages_read ?? 0;
      if (value === prev) return;
      setSavingPages(true);
      try {
        const { error } = await supabase
          .from("user_books")
          .update({ pages_read: value })
          .eq("id", reading.id);
        if (error) throw error;
        setReading({ ...reading, pages_read: value });

        if (value > prev) {
          const res = await awardXP(supabase as any, profile.id, "page_read");
          if (res) {
            toast("+10 XP por leitura!", "xp");
            await reload();
          }
        }
      } catch (e) {
        console.error(e);
        toast("Não foi possível salvar o progresso.", "error");
      } finally {
        setSavingPages(false);
      }
    },
    [profile, reading, supabase, toast, reload]
  );

  const onSlider = (value: number) => {
    setPagesRead(value);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => commitPages(value), 700);
  };

  const onSliderRelease = (value: number) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    commitPages(value);
  };

  const markAsRead = async () => {
    if (!profile || !reading) return;
    setMarking(true);
    try {
      const { error } = await supabase
        .from("user_books")
        .update({ status: "read", finished_at: new Date().toISOString() })
        .eq("id", reading.id);
      if (error) throw error;
      const res = await awardXP(supabase as any, profile.id, "book_read");
      if (res) toast("Livro concluído! +100 XP", "xp");
      await reload();
      await loadData();
    } catch (e) {
      console.error(e);
      toast("Erro ao marcar como lido.", "error");
    } finally {
      setMarking(false);
    }
  };

  const drawBook = () => {
    if (wantToRead.length === 0) {
      toast("Adicione livros em 'Quero Ler' para sortear.", "info");
      return;
    }
    const pick = wantToRead[Math.floor(Math.random() * wantToRead.length)];
    setDrawn(pick);
  };

  const startReading = async (ub: UserBook) => {
    if (!profile) return;
    setStarting(true);
    try {
      const { error } = await supabase
        .from("user_books")
        .update({ status: "reading", started_at: new Date().toISOString() })
        .eq("id", ub.id);
      if (error) throw error;
      toast("Boa leitura!", "success");
      setDrawn(null);
      await loadData();
    } catch (e) {
      console.error(e);
      toast("Erro ao iniciar a leitura.", "error");
    } finally {
      setStarting(false);
    }
  };

  // Top genres aggregation
  const genreCounts = new Map<string, number>();
  for (const ub of readBooks) {
    const g = ub.book?.genre;
    if (g) genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
  }
  const sortedGenres = Array.from(genreCounts.entries()).sort((a, b) => b[1] - a[1]);
  const topGenres: { genre: string; count: number }[] = sortedGenres
    .slice(0, 6)
    .map(([genre, count]) => ({ genre, count }));
  for (const g of GENRES) {
    if (topGenres.length >= 6) break;
    if (!topGenres.some((t) => t.genre === g)) topGenres.push({ genre: g, count: 0 });
  }

  // Show spinner only on first load; if profile is unavailable render empty state
  if (loading && !profile) return <FullPageSpinner />;
  if (!profile) return null;

  const firstName = (profile.full_name || profile.username || "Leitor").split(/\s+/)[0];
  const annualGoal = profile.annual_goal || 0;
  const goalPct = annualGoal > 0 ? Math.min(100, Math.round((readCount / annualGoal) * 100)) : 0;
  const totalPages = reading?.book?.page_count ?? null;
  const readingPct = progressPct(pagesRead, totalPages);
  const reachedEnd = !!totalPages && pagesRead >= totalPages;

  return (
    <div className="flex flex-col gap-6 px-4 pb-28 pt-6">
      {/* 1. Greeting */}
      <header>
        <h1 className="font-display text-3xl font-bold text-on-surface">
          Olá, {firstName}!
        </h1>
        <p className="mt-1 text-sm text-on-surface-muted">
          Pronto para mais algumas páginas hoje?
        </p>
      </header>

      {/* 2. Streak */}
      <StreakTracker
        current={streak?.current_streak ?? 0}
        longest={streak?.longest_streak ?? 0}
        lastActivityDate={streak?.last_activity_date ?? null}
      />

      {/* 3. Annual goal */}
      <div className="neu-card p-5">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-display text-lg font-bold text-on-surface">
            Meta Anual
          </h2>
          <span className="text-sm text-on-surface-muted">
            {readCount} de {annualGoal} livros
          </span>
        </div>
        <ProgressBar value={goalPct} glow />
        <p className="mt-2 text-xs text-on-surface-muted">
          {annualGoal > 0 && readCount >= annualGoal
            ? "Meta alcançada! Parabéns."
            : `${goalPct}% da sua meta de ${annualGoal} livros.`}
        </p>
      </div>

      {/* 4. Rank */}
      <RankDisplay xp={profile.xp} />

      {/* 5. Lendo Agora */}
      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-on-surface">
          Lendo Agora
        </h2>
        {reading && reading.book ? (
          <div className="neu-card flex flex-col gap-4 p-5">
            <div className="flex gap-4">
              <Link href={`/app/livro/${reading.book_id}`} className="w-24 shrink-0">
                <BookCover
                  url={reading.book.cover_url}
                  title={reading.book.title}
                  author={reading.book.author}
                />
              </Link>
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <Link href={`/app/livro/${reading.book_id}`}>
                    <h3 className="font-display text-base font-bold leading-tight text-on-surface">
                      {reading.book.title}
                    </h3>
                  </Link>
                  <p className="text-sm text-on-surface-muted">
                    {reading.book.author}
                  </p>
                </div>
                <div className="mt-2">
                  <div className="mb-1 flex justify-between text-xs text-on-surface-muted">
                    <span>
                      {pagesRead}
                      {totalPages ? ` / ${totalPages}` : ""} páginas
                    </span>
                    <span>{readingPct}%</span>
                  </div>
                  <ProgressBar value={readingPct} />
                </div>
              </div>
            </div>

            {totalPages ? (
              <div>
                <input
                  type="range"
                  min={0}
                  max={totalPages}
                  value={pagesRead}
                  disabled={savingPages}
                  onChange={(e) => onSlider(Number(e.target.value))}
                  onMouseUp={(e) => onSliderRelease(Number((e.target as HTMLInputElement).value))}
                  onTouchEnd={(e) => onSliderRelease(Number((e.target as HTMLInputElement).value))}
                  className="w-full accent-primary"
                  aria-label="Páginas lidas"
                />
              </div>
            ) : (
              <p className="text-xs text-on-surface-muted">
                Este livro não tem número de páginas cadastrado.
              </p>
            )}

            {reachedEnd && (
              <Button
                variant="primary"
                fullWidth
                loading={marking}
                onClick={markAsRead}
              >
                Marcar como lido
              </Button>
            )}
          </div>
        ) : (
          <div className="neu-card flex flex-col items-center gap-2 p-6 text-center">
            <BookOpen size={32} className="text-primary" strokeWidth={1.5} />
            <p className="text-sm text-on-surface-muted">
              Você não está lendo nenhum livro agora.
            </p>
            <Link href="/app/estante">
              <Button variant="secondary" size="sm">
                Ir para a Estante
              </Button>
            </Link>
          </div>
        )}
      </section>

      {/* 6. Sortear próximo livro */}
      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-on-surface">
          Sortear Próximo Livro
        </h2>
        {drawn && drawn.book ? (
          <div className="neu-card flex gap-4 p-5 ring-2 ring-primary/40 animate-fade-in">
            <Link href={`/app/livro/${drawn.book_id}`} className="w-20 shrink-0">
              <BookCover
                url={drawn.book.cover_url}
                title={drawn.book.title}
                author={drawn.book.author}
              />
            </Link>
            <div className="flex flex-1 flex-col justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-primary">
                  Que tal este?
                </p>
                <Link href={`/app/livro/${drawn.book_id}`}>
                  <h3 className="font-display text-base font-bold leading-tight text-on-surface">
                    {drawn.book.title}
                  </h3>
                </Link>
                <p className="text-sm text-on-surface-muted">{drawn.book.author}</p>
              </div>
              <div className="mt-2 flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  loading={starting}
                  onClick={() => startReading(drawn)}
                >
                  Começar a ler
                </Button>
                <Button variant="ghost" size="sm" onClick={drawBook}>
                  Sortear outro
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Button variant="secondary" fullWidth onClick={drawBook}>
            <Shuffle size={16} strokeWidth={2} />
            Sortear da lista &ldquo;Quero Ler&rdquo;
          </Button>
        )}
      </section>

      {/* 7. Meu Ranking (top genres) */}
      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-on-surface">
          Meu Ranking
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {topGenres.map((g) => (
            <div
              key={g.genre}
              className="neu-inset flex flex-col items-center justify-center gap-1 rounded-xl p-3 text-center"
            >
              <span className="text-sm font-semibold text-on-surface">{g.genre}</span>
              <span className="text-xs text-on-surface-muted">
                {g.count} {g.count === 1 ? "livro" : "livros"}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 8. Quick links */}
      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-on-surface">Explorar</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: "/app/campeonato", label: "Campeonatos", Icon: Trophy,     sub: "Compita e ganhe prêmios" },
            { href: "/app/explore",    label: "Explorar",    Icon: Search,     sub: "Descubra leitores" },
            { href: "/app/conquistas", label: "Conquistas",  Icon: Award,      sub: "Seus emblemas" },
            { href: "/app/colecoes",   label: "Coleções",    Icon: FolderOpen, sub: "Organize seus livros" },
          ].map((it) => (
            <Link key={it.href} href={it.href}>
              <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-surface p-4 active:scale-95 transition-transform">
                <it.Icon size={24} className="text-primary shrink-0" strokeWidth={1.5} />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-on-surface">{it.label}</p>
                  <p className="text-xs text-on-surface/50">{it.sub}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 9. Social feed preview */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-on-surface">
            Da Comunidade
          </h2>
          <Link href="/app/social" className="text-sm text-primary">
            Ver tudo
          </Link>
        </div>
        {feed.length === 0 ? (
          <p className="text-sm text-on-surface-muted">
            Nenhuma publicação por aqui ainda.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {feed.map((post) => (
              <Link key={post.id} href="/app/social">
                <div className="neu-card flex gap-3 p-4">
                  <Avatar
                    src={post.author?.avatar_url}
                    name={post.author?.full_name || post.author?.username}
                    size={40}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-on-surface">
                      {post.author?.full_name || post.author?.username || "Leitor"}
                    </p>
                    <p className="line-clamp-2 text-sm text-on-surface-muted">
                      {post.has_spoiler ? "— Contém spoiler" : post.content}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-on-surface-muted">
                      <Heart size={11} className="fill-red-400 text-red-400" />
                      {post.likes_count}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
