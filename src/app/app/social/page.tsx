"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useProfileContext } from "@/lib/hooks/profileContext";
import { useToast } from "@/lib/hooks/useToast";
import { awardXP } from "@/lib/gamification";
import { getRankForXP } from "@/lib/constants";
import { timeAgo } from "@/lib/utils/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { FullPageSpinner, Spinner } from "@/components/ui/Spinner";
import { Avatar } from "@/components/ui/Avatar";
import { Trophy, Eye, Heart, MessageCircle, Link2 } from "lucide-react";
import { BookCover } from "@/components/books/BookCover";
import type { Post, PostComment, Book, Championship } from "@/types";

type FeedPost = Post & { author?: any; book?: Book | null; liked_by_me?: boolean };
type Tab = "seguindo" | "explorar";

export default function SocialPage() {
  const supabase = getSupabaseBrowser();
  const { profile, reload } = useProfileContext();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("explorar");
  const [search, setSearch] = useState("");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [championship, setChampionship] = useState<Championship | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [likeBusy, setLikeBusy] = useState<Set<string>>(new Set());

  // comments modal
  const [commentsFor, setCommentsFor] = useState<FeedPost | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // composer modal
  const [composerOpen, setComposerOpen] = useState(false);
  const [composeContent, setComposeContent] = useState("");
  const [composeSpoiler, setComposeSpoiler] = useState(false);
  const [composeBook, setComposeBook] = useState<Book | null>(null);
  const [bookQuery, setBookQuery] = useState("");
  const [bookResults, setBookResults] = useState<Book[]>([]);
  const [bookSearching, setBookSearching] = useState(false);
  const [posting, setPosting] = useState(false);

  const loadFeed = useCallback(
    async (which: Tab) => {
      if (!profile) return;
      setLoading(true);
      try {
        let query = supabase
          .from("posts")
          .select("*, author:profiles(*), book:books(*)")
          .order("created_at", { ascending: false })
          .limit(50);

        if (which === "seguindo") {
          const { data: follows, error: fErr } = await supabase
            .from("follows")
            .select("following_id")
            .eq("follower_id", profile.id);
          if (fErr) throw fErr;
          const ids = (follows ?? []).map((f) => f.following_id);
          if (ids.length === 0) {
            setPosts([]);
            setLoading(false);
            return;
          }
          query = query.in("user_id", ids);
        }

        const { data, error } = await query;
        if (error) throw error;
        const list = (data ?? []) as FeedPost[];

        // liked_by_me set
        const postIds = list.map((p) => p.id);
        let likedSet = new Set<string>();
        if (postIds.length > 0) {
          const { data: likes } = await supabase
            .from("post_likes")
            .select("post_id")
            .eq("user_id", profile.id)
            .in("post_id", postIds);
          likedSet = new Set((likes ?? []).map((l) => l.post_id));
        }
        setPosts(list.map((p) => ({ ...p, liked_by_me: likedSet.has(p.id) })));
      } catch (e: any) {
        toast(e?.message ?? "Erro ao carregar o feed", "error");
        setPosts([]);
      } finally {
        setLoading(false);
      }
    },
    [profile, supabase, toast]
  );

  useEffect(() => {
    if (profile) loadFeed(tab);
  }, [profile, tab, loadFeed]);

  // active championship banner
  useEffect(() => {
    let active = true;
    (async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("championships")
        .select("*")
        .lte("start_date", nowIso)
        .gte("end_date", nowIso)
        .limit(1)
        .maybeSingle();
      if (active) setChampionship((data as Championship) ?? null);
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  const visiblePosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((p) => {
      const content = p.content?.toLowerCase() ?? "";
      const name = (p.author?.full_name ?? p.author?.username ?? "").toLowerCase();
      return content.includes(q) || name.includes(q);
    });
  }, [posts, search]);

  function toggleReveal(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function toggleLike(post: FeedPost) {
    if (!profile || likeBusy.has(post.id)) return;
    setLikeBusy((prev) => new Set(prev).add(post.id));
    const wasLiked = !!post.liked_by_me;
    // optimistic
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              liked_by_me: !wasLiked,
              likes_count: Math.max(0, (p.likes_count ?? 0) + (wasLiked ? -1 : 1)),
            }
          : p
      )
    );
    try {
      if (wasLiked) {
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", profile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("post_likes")
          .insert({ post_id: post.id, user_id: profile.id });
        if (error) throw error;
        await awardXP(supabase as any, profile.id, "reaction", post.id);
        await reload();
      }
    } catch (e: any) {
      // revert
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? {
                ...p,
                liked_by_me: wasLiked,
                likes_count: Math.max(0, (p.likes_count ?? 0) + (wasLiked ? 1 : -1)),
              }
            : p
        )
      );
      toast(e?.message ?? "Erro ao reagir", "error");
    } finally {
      setLikeBusy((prev) => {
        const next = new Set(prev);
        next.delete(post.id);
        return next;
      });
    }
  }

  async function openComments(post: FeedPost) {
    setCommentsFor(post);
    setComments([]);
    setNewComment("");
    setCommentsLoading(true);
    try {
      const { data, error } = await supabase
        .from("post_comments")
        .select("*, author:profiles(*)")
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setComments((data ?? []) as PostComment[]);
    } catch (e: any) {
      toast(e?.message ?? "Erro ao carregar comentários", "error");
    } finally {
      setCommentsLoading(false);
    }
  }

  async function submitComment() {
    if (!profile || !commentsFor) return;
    const text = newComment.trim();
    if (!text) return;
    setCommentSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("post_comments")
        .insert({ post_id: commentsFor.id, user_id: profile.id, content: text })
        .select("*, author:profiles(*)")
        .single();
      if (error) throw error;
      setComments((prev) => [...prev, data as PostComment]);
      setNewComment("");
      setPosts((prev) =>
        prev.map((p) =>
          p.id === commentsFor.id
            ? { ...p, comments_count: (p.comments_count ?? 0) + 1 }
            : p
        )
      );
      await awardXP(supabase as any, profile.id, "comment_written", commentsFor.id);
      await reload();
    } catch (e: any) {
      toast(e?.message ?? "Erro ao comentar", "error");
    } finally {
      setCommentSubmitting(false);
    }
  }

  async function sharePost(post: FeedPost) {
    const text = post.content ?? "";
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        await (navigator as any).share({ title: "Readly", text });
      } else {
        await navigator.clipboard.writeText(text);
        toast("Copiado", "success");
      }
    } catch {
      // user cancelled share or clipboard failed silently
    }
  }

  // book search for composer
  useEffect(() => {
    if (!composerOpen) return;
    const q = bookQuery.trim();
    if (q.length < 2) {
      setBookResults([]);
      return;
    }
    let active = true;
    setBookSearching(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("books")
        .select("*")
        .ilike("title", `%${q}%`)
        .limit(8);
      if (active) {
        setBookResults((data ?? []) as Book[]);
        setBookSearching(false);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [bookQuery, composerOpen, supabase]);

  function resetComposer() {
    setComposeContent("");
    setComposeSpoiler(false);
    setComposeBook(null);
    setBookQuery("");
    setBookResults([]);
  }

  async function submitPost() {
    if (!profile) return;
    const content = composeContent.trim();
    if (!content) {
      toast("Escreva algo para publicar", "info");
      return;
    }
    setPosting(true);
    try {
      const { error } = await supabase.from("posts").insert({
        user_id: profile.id,
        book_id: composeBook?.id ?? null,
        content,
        has_spoiler: composeSpoiler,
      });
      if (error) throw error;
      await awardXP(supabase as any, profile.id, "post_published");
      await reload();
      toast("Publicado!", "success");
      setComposerOpen(false);
      resetComposer();
      await loadFeed(tab);
    } catch (e: any) {
      toast(e?.message ?? "Erro ao publicar", "error");
    } finally {
      setPosting(false);
    }
  }

  if (!profile) return <FullPageSpinner />;

  return (
    <div className="space-y-4 pb-28">
      <h1 className="font-display text-2xl font-bold">Social</h1>

      {championship && (
        <Link href="/app/campeonato">
          <div className="animate-pulse-glow rounded-2xl bg-primary/20 p-4 shadow-glow ring-1 ring-primary/40">
            <div className="flex items-center gap-3">
              <Trophy size={22} className="text-primary shrink-0" strokeWidth={1.5} />
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Campeonato ao vivo
                </p>
                <p className="font-display text-base font-bold text-on-surface">
                  {championship.title}
                </p>
              </div>
              <span className="text-on-surface-muted">›</span>
            </div>
          </div>
        </Link>
      )}

      {/* search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por autor ou conteúdo..."
        className="w-full rounded-2xl bg-surface-light px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
      />

      {/* tabs */}
      <div className="flex gap-2 rounded-2xl bg-surface-light p-1">
        {(["seguindo", "explorar"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "flex-1 rounded-xl py-2 text-sm font-semibold capitalize transition " +
              (tab === t
                ? "bg-primary text-on-primary shadow-neu"
                : "text-on-surface-muted")
            }
          >
            {t === "seguindo" ? "Seguindo" : "Explorar"}
          </button>
        ))}
      </div>

      {/* feed */}
      {loading ? (
        <FullPageSpinner />
      ) : visiblePosts.length === 0 ? (
        <Card className="text-center text-on-surface-muted">
          {tab === "seguindo" ? (
            <div className="space-y-2">
              <Eye size={32} className="mx-auto text-on-surface-muted" strokeWidth={1.5} />
              <p>Você ainda não segue ninguém.</p>
              <Button variant="secondary" size="sm" onClick={() => setTab("explorar")}>
                Explorar a comunidade
              </Button>
            </div>
          ) : search.trim() ? (
            <p>Nenhum resultado para “{search}”.</p>
          ) : (
            <p>Nenhuma publicação ainda. Seja o primeiro!</p>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {visiblePosts.map((post) => {
            const author = post.author;
            const rank = getRankForXP(author?.xp ?? 0);
            const spoilerHidden = post.has_spoiler && !revealed.has(post.id);
            return (
              <Card key={post.id} className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={author?.avatar_url}
                    name={author?.full_name ?? author?.username}
                    size={42}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-on-surface">
                        {author?.full_name ?? author?.username ?? "Leitor"}
                      </p>
                      <Badge color={rank.color}>
                        {rank.emoji} {rank.name}
                      </Badge>
                    </div>
                    <p className="text-xs text-on-surface-muted">
                      {timeAgo(post.created_at)}
                    </p>
                  </div>
                </div>

                {post.book && (
                  <Link href={`/app/livro/${post.book_id}`}>
                    <div className="flex items-center gap-3 rounded-xl bg-surface-light/60 p-2">
                      <div className="w-10 shrink-0">
                        <BookCover
                          url={post.book.cover_url}
                          title={post.book.title}
                          author={post.book.author}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-on-surface">
                          {post.book.title}
                        </p>
                        <p className="truncate text-xs text-on-surface-muted">
                          {post.book.author}
                        </p>
                      </div>
                    </div>
                  </Link>
                )}

                <div className="relative">
                  <p
                    className={
                      "whitespace-pre-wrap text-sm text-on-surface " +
                      (spoilerHidden ? "select-none blur-sm" : "")
                    }
                  >
                    {post.content}
                  </p>
                  {spoilerHidden && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Button size="sm" variant="secondary" onClick={() => toggleReveal(post.id)}>
                        Revelar spoiler
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 pt-1 text-sm text-on-surface-muted">
                  <button
                    onClick={() => toggleLike(post)}
                    disabled={likeBusy.has(post.id)}
                    className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition hover:bg-white/5 active:scale-95"
                  >
                    <Heart
                      size={15}
                      className={post.liked_by_me ? "fill-red-400 text-red-400" : "text-on-surface-muted"}
                      strokeWidth={2}
                    />
                    <span>{post.likes_count ?? 0}</span>
                  </button>
                  <button
                    onClick={() => openComments(post)}
                    className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition hover:bg-white/5 active:scale-95"
                  >
                    <MessageCircle size={15} className="text-on-surface-muted" strokeWidth={2} />
                    <span>{post.comments_count ?? 0}</span>
                  </button>
                  <button
                    onClick={() => sharePost(post)}
                    className="ml-auto flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition hover:bg-white/5 active:scale-95"
                  >
                    <Link2 size={15} className="text-on-surface-muted" strokeWidth={2} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* floating compose button */}
      <button
        onClick={() => setComposerOpen(true)}
        aria-label="Nova publicação"
        className="fixed bottom-36 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg transition active:scale-95"
        style={{ boxShadow: "0 4px 24px rgba(152,189,168,0.4)" }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
      </button>

      {/* comments modal */}
      <Modal
        open={!!commentsFor}
        onClose={() => setCommentsFor(null)}
        title="Comentários"
      >
        <div className="space-y-3">
          {commentsLoading ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : comments.length === 0 ? (
            <p className="py-4 text-center text-sm text-on-surface-muted">
              Nenhum comentário ainda. Comece a conversa!
            </p>
          ) : (
            <div className="max-h-72 space-y-3 overflow-y-auto">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <Avatar
                    src={c.author?.avatar_url}
                    name={c.author?.full_name ?? c.author?.username}
                    size={32}
                  />
                  <div className="min-w-0 flex-1 rounded-2xl bg-surface-light/60 px-3 py-2">
                    <p className="text-xs font-semibold text-on-surface">
                      {c.author?.full_name ?? c.author?.username ?? "Leitor"}
                      <span className="ml-2 font-normal text-on-surface-muted">
                        {timeAgo(c.created_at)}
                      </span>
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-on-surface">
                      {c.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitComment();
                }
              }}
              placeholder="Escreva um comentário..."
              className="flex-1 rounded-2xl bg-surface-light px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <Button
              size="sm"
              loading={commentSubmitting}
              disabled={!newComment.trim()}
              onClick={submitComment}
            >
              Enviar
            </Button>
          </div>
        </div>
      </Modal>

      {/* composer modal */}
      <Modal
        open={composerOpen}
        onClose={() => {
          setComposerOpen(false);
          resetComposer();
        }}
        title="Nova publicação"
      >
        <div className="space-y-4">
          <textarea
            value={composeContent}
            onChange={(e) => setComposeContent(e.target.value)}
            rows={4}
            placeholder="O que você está lendo ou pensando?"
            className="w-full resize-none rounded-2xl bg-surface-light px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
          />

          {composeBook ? (
            <div className="flex items-center gap-3 rounded-xl bg-surface-light/60 p-2">
              <div className="w-9 shrink-0">
                <BookCover
                  url={composeBook.cover_url}
                  title={composeBook.title}
                  author={composeBook.author}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-on-surface">
                  {composeBook.title}
                </p>
                <p className="truncate text-xs text-on-surface-muted">
                  {composeBook.author}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setComposeBook(null)}>
                Remover
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                value={bookQuery}
                onChange={(e) => setBookQuery(e.target.value)}
                placeholder="Anexar um livro (opcional)..."
                className="w-full rounded-2xl bg-surface-light px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              {bookSearching && (
                <div className="flex justify-center py-2">
                  <Spinner className="h-5 w-5" />
                </div>
              )}
              {bookResults.length > 0 && (
                <div className="max-h-44 space-y-1 overflow-y-auto">
                  {bookResults.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setComposeBook(b);
                        setBookQuery("");
                        setBookResults([]);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/5"
                    >
                      <div className="w-8 shrink-0">
                        <BookCover url={b.cover_url} title={b.title} author={b.author} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm text-on-surface">{b.title}</p>
                        <p className="truncate text-xs text-on-surface-muted">{b.author}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-surface-light/60 px-4 py-3">
            <span className="text-sm text-on-surface">Contém spoiler</span>
            <input
              type="checkbox"
              checked={composeSpoiler}
              onChange={(e) => setComposeSpoiler(e.target.checked)}
              className="h-5 w-5 accent-primary"
            />
          </label>

          <Button fullWidth loading={posting} onClick={submitPost}>
            Publicar
          </Button>
        </div>
      </Modal>
    </div>
  );
}
