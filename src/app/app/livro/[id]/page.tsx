"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useProfileContext } from "@/lib/hooks/profileContext";
import { useToast } from "@/lib/hooks/useToast";
import { awardXP } from "@/lib/gamification";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StarRating } from "@/components/ui/StarRating";
import { Badge } from "@/components/ui/Badge";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { Search, Heart, Share2 } from "lucide-react";
import { BookCover } from "@/components/books/BookCover";
import { ShareCardShell } from "@/components/sharing/ShareCardShell";
import { BookFinishedCard } from "@/components/sharing/BookFinishedCard";
import { STATUS_LABELS } from "@/lib/constants";
import { progressPct, timeAgo } from "@/lib/utils/format";
import type { Book, UserBook, BookReview, DiaryEntry } from "@/types";

type Status = "reading" | "read" | "want_to_read" | "abandoned";
const STATUS_ORDER: Status[] = ["want_to_read", "reading", "read", "abandoned"];
const ENTRY_EMOJI: Record<string, string> = {
  quote: "❝",
  reflection: "💭",
  note: "📝",
};
const ENTRY_LABELS: Record<string, string> = {
  quote: "Citação",
  reflection: "Reflexão",
  note: "Nota",
};

export default function BookDetailPage({ params }: { params: { id: string } }) {
  const bookId = params.id;
  const supabase = getSupabaseBrowser();
  const router = useRouter();
  const { profile, reload } = useProfileContext();
  const { toast } = useToast();
  const userId = profile?.id;

  const [loading, setLoading] = useState(true);
  const [book, setBook] = useState<Book | null>(null);
  const [userBook, setUserBook] = useState<UserBook | null>(null);
  const [review, setReview] = useState<BookReview | null>(null);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [readCount, setReadCount] = useState(0);

  // Review form
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  // Page progress (local while dragging)
  const [pages, setPages] = useState(0);
  const lastCommittedPages = useRef(0);

  // Diary modal
  const [diaryOpen, setDiaryOpen] = useState(false);
  const [entryType, setEntryType] = useState<"quote" | "reflection" | "note">("note");
  const [entryPage, setEntryPage] = useState("");
  const [entryContent, setEntryContent] = useState("");
  const [savingEntry, setSavingEntry] = useState(false);

  // Share / delete
  const [shareOpen, setShareOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busyStatus, setBusyStatus] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [bookRes, ubRes, revRes, diaryRes, countRes] = await Promise.all([
        supabase.from("books").select("*").eq("id", bookId).single(),
        supabase
          .from("user_books")
          .select("*")
          .eq("user_id", userId)
          .eq("book_id", bookId)
          .maybeSingle(),
        supabase
          .from("book_reviews")
          .select("*")
          .eq("user_id", userId)
          .eq("book_id", bookId)
          .maybeSingle(),
        supabase
          .from("diary_entries")
          .select("*")
          .eq("user_id", userId)
          .eq("book_id", bookId)
          .order("created_at", { ascending: false }),
        supabase
          .from("user_books")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "read"),
      ]);

      if (bookRes.error) throw bookRes.error;
      setBook(bookRes.data as Book);

      const ub = (ubRes.data as UserBook) ?? null;
      setUserBook(ub);
      const p = ub?.pages_read ?? 0;
      setPages(p);
      lastCommittedPages.current = p;

      const rev = (revRes.data as BookReview) ?? null;
      setReview(rev);
      setRating(rev?.rating ?? 0);
      setReviewText(rev?.review_text ?? "");

      setEntries((diaryRes.data as DiaryEntry[]) ?? []);
      setReadCount(countRes.count ?? 0);
    } catch (e) {
      console.error(e);
      toast("Erro ao carregar o livro.", "error");
    } finally {
      setLoading(false);
    }
  }, [supabase, bookId, userId, toast]);

  useEffect(() => {
    if (userId) load();
  }, [userId, load]);

  // --- Shelf / status ---
  async function addToShelf() {
    if (!userId) return;
    setBusyStatus(true);
    try {
      const { data, error } = await supabase
        .from("user_books")
        .insert({ user_id: userId, book_id: bookId, status: "want_to_read" })
        .select("*")
        .single();
      if (error) throw error;
      setUserBook(data as UserBook);
      toast("Adicionado à estante!", "success");
    } catch (e) {
      console.error(e);
      toast("Não foi possível adicionar à estante.", "error");
    } finally {
      setBusyStatus(false);
    }
  }

  async function changeStatus(next: Status) {
    if (!userId || !userBook || busyStatus) return;
    if (userBook.status === next) return;
    setBusyStatus(true);
    try {
      const patch: Partial<UserBook> = { status: next };
      if (next === "read") patch.finished_at = new Date().toISOString();
      if (next === "reading" && !userBook.started_at)
        patch.started_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("user_books")
        .update(patch)
        .eq("id", userBook.id)
        .select("*")
        .single();
      if (error) throw error;
      setUserBook(data as UserBook);

      if (next === "read") {
        await awardXP(supabase as any, userId, "book_read", bookId);
        await reload();
        setReadCount((c) => c + 1);
        toast("Livro concluído! +100 XP 🎉", "xp");
      } else {
        toast(`Status: ${STATUS_LABELS[next]}`, "success");
      }
    } catch (e) {
      console.error(e);
      toast("Erro ao atualizar status.", "error");
    } finally {
      setBusyStatus(false);
    }
  }

  // --- Page progress ---
  async function commitPages(value: number) {
    if (!userId || !userBook) return;
    const prev = lastCommittedPages.current;
    if (value === prev) return;
    try {
      const { data, error } = await supabase
        .from("user_books")
        .update({ pages_read: value })
        .eq("id", userBook.id)
        .select("*")
        .single();
      if (error) throw error;
      setUserBook(data as UserBook);
      lastCommittedPages.current = value;
      if (value > prev) {
        await awardXP(supabase as any, userId, "page_read", bookId);
        await reload();
        toast("+10 XP por leitura!", "xp");
      }
    } catch (e) {
      console.error(e);
      toast("Erro ao salvar progresso.", "error");
      setPages(prev);
    }
  }

  // --- Favorite ---
  async function toggleFavorite() {
    if (!userId || !userBook) return;
    const next = !userBook.is_favorite;
    setUserBook({ ...userBook, is_favorite: next });
    try {
      const { error } = await supabase
        .from("user_books")
        .update({ is_favorite: next })
        .eq("id", userBook.id);
      if (error) throw error;
    } catch (e) {
      console.error(e);
      setUserBook({ ...userBook, is_favorite: !next });
      toast("Erro ao favoritar.", "error");
    }
  }

  // --- Review ---
  async function saveReview() {
    if (!userId) return;
    if (rating < 1) {
      toast("Escolha uma nota de 1 a 5 estrelas.", "info");
      return;
    }
    setSavingReview(true);
    const hadText = !!review?.review_text?.trim();
    const hasText = !!reviewText.trim();
    try {
      const { data, error } = await supabase
        .from("book_reviews")
        .upsert(
          {
            user_id: userId,
            book_id: bookId,
            rating,
            review_text: reviewText.trim() || null,
          },
          { onConflict: "user_id,book_id" }
        )
        .select("*")
        .single();
      if (error) throw error;
      setReview(data as BookReview);

      if (!hadText && hasText) {
        await awardXP(supabase as any, userId, "review_written", bookId);
        await reload();
        toast("Resenha salva! +50 XP ✍️", "xp");
      } else {
        toast("Resenha salva!", "success");
      }
    } catch (e) {
      console.error(e);
      toast("Erro ao salvar resenha.", "error");
    } finally {
      setSavingReview(false);
    }
  }

  // --- Diary ---
  async function addEntry() {
    if (!userId) return;
    if (!entryContent.trim()) {
      toast("Escreva o conteúdo da entrada.", "info");
      return;
    }
    setSavingEntry(true);
    try {
      const pageNum = entryPage.trim() ? parseInt(entryPage, 10) : null;
      const { data, error } = await supabase
        .from("diary_entries")
        .insert({
          user_id: userId,
          book_id: bookId,
          entry_type: entryType,
          page_number: Number.isFinite(pageNum as number) ? pageNum : null,
          content: entryContent.trim(),
        })
        .select("*")
        .single();
      if (error) throw error;
      setEntries((prev) => [data as DiaryEntry, ...prev]);
      await awardXP(supabase as any, userId, "diary_entry", bookId);
      await reload();
      toast("Entrada adicionada! +25 XP 📖", "xp");
      setDiaryOpen(false);
      setEntryContent("");
      setEntryPage("");
      setEntryType("note");
    } catch (e) {
      console.error(e);
      toast("Erro ao adicionar entrada.", "error");
    } finally {
      setSavingEntry(false);
    }
  }

  // --- Delete ---
  async function deleteFromShelf() {
    if (!userId || !userBook) return;
    setDeleting(true);
    try {
      await supabase
        .from("diary_entries")
        .delete()
        .eq("user_id", userId)
        .eq("book_id", bookId);
      await supabase
        .from("book_reviews")
        .delete()
        .eq("user_id", userId)
        .eq("book_id", bookId);
      const { error } = await supabase
        .from("user_books")
        .delete()
        .eq("id", userBook.id);
      if (error) throw error;
      toast("Removido da estante.", "success");
      router.push("/app/estante");
    } catch (e) {
      console.error(e);
      toast("Erro ao remover livro.", "error");
      setDeleting(false);
    }
  }

  const maxPages = useMemo(() => book?.page_count ?? 0, [book]);
  const pct = progressPct(pages, book?.page_count ?? null);

  if (loading || !profile) return <FullPageSpinner />;

  if (!book) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <Search size={48} className="text-on-surface-muted" strokeWidth={1.2} />
        <p className="text-on-surface-muted">Livro não encontrado.</p>
        <Button variant="secondary" onClick={() => router.push("/app/estante")}>
          Voltar à estante
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <header className="flex flex-col items-center gap-3 text-center">
        <div className="w-40">
          <BookCover url={book.cover_url} title={book.title} author={book.author} />
        </div>
        <h1 className="font-display text-2xl font-bold leading-tight">{book.title}</h1>
        <p className="text-on-surface-muted">{book.author}</p>
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
          {book.genre && <Badge>{book.genre}</Badge>}
          {book.page_count != null && (
            <Badge color="#A9B8AE">{book.page_count} págs</Badge>
          )}
          {book.published_year != null && (
            <Badge color="#A9B8AE">{book.published_year}</Badge>
          )}
          <Badge color="#E0B341">★ {book.rating_avg.toFixed(1)}</Badge>
        </div>
        {book.description && (
          <p className="text-sm leading-relaxed text-on-surface-muted">
            {book.description}
          </p>
        )}
      </header>

      {!userBook ? (
        <Button fullWidth loading={busyStatus} onClick={addToShelf}>
          + Adicionar à estante
        </Button>
      ) : (
        <>
          {/* Status selector */}
          <Card>
            <h2 className="mb-3 font-display text-lg font-bold">Status</h2>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_ORDER.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={busyStatus}
                  onClick={() => changeStatus(s)}
                  className={
                    "rounded-2xl px-3 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 " +
                    (userBook.status === s
                      ? "bg-primary text-on-primary shadow-neu"
                      : "bg-surface-light text-on-surface")
                  }
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </Card>

          {/* Page progress */}
          {maxPages > 0 && (
            <Card>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">Progresso</h2>
                <span className="text-sm text-on-surface-muted">
                  {pages} / {maxPages} págs
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={maxPages}
                value={pages}
                onChange={(e) => setPages(parseInt(e.target.value, 10))}
                onMouseUp={(e) =>
                  commitPages(parseInt((e.target as HTMLInputElement).value, 10))
                }
                onTouchEnd={(e) =>
                  commitPages(parseInt((e.target as HTMLInputElement).value, 10))
                }
                className="w-full accent-primary"
              />
              <div className="mt-3">
                <ProgressBar value={pct} glow />
              </div>
              <p className="mt-2 text-xs text-on-surface-muted">
                {pct}% lido · +10 XP por página avançada
              </p>
            </Card>
          )}

          {/* Favorite */}
          <button
            type="button"
            onClick={toggleFavorite}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-surface-light px-4 py-3 text-sm font-semibold shadow-neu transition active:scale-[0.98]"
          >
            <Heart
              size={20}
              className={userBook.is_favorite ? "fill-red-400 text-red-400" : "text-on-surface-muted"}
              strokeWidth={2}
            />
            {userBook.is_favorite ? "Favorito" : "Favoritar"}
          </button>
        </>
      )}

      {/* Rating + review */}
      <Card>
        <h2 className="mb-3 font-display text-lg font-bold">Sua resenha</h2>
        <StarRating value={rating} onChange={setRating} size="lg" />
        <textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="O que você achou deste livro?"
          rows={4}
          className="mt-3 w-full rounded-2xl bg-surface-light p-3 text-sm text-on-surface outline-none placeholder:text-on-surface-muted neu-inset"
        />
        <Button
          fullWidth
          className="mt-3"
          loading={savingReview}
          onClick={saveReview}
        >
          Salvar resenha
        </Button>
      </Card>

      {/* Diary */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Diário de leitura</h2>
          <Button size="sm" variant="secondary" onClick={() => setDiaryOpen(true)}>
            + Adicionar entrada
          </Button>
        </div>
        {entries.length === 0 ? (
          <p className="py-4 text-center text-sm text-on-surface-muted">
            Nenhuma entrada ainda. Registre suas citações e reflexões!
          </p>
        ) : (
          <ul className="space-y-3">
            {entries.map((en) => (
              <li key={en.id} className="rounded-2xl bg-surface-light p-3 neu-inset">
                <div className="mb-1 flex items-center gap-2 text-xs text-on-surface-muted">
                  <span className="text-base">{ENTRY_EMOJI[en.entry_type]}</span>
                  <span>{ENTRY_LABELS[en.entry_type]}</span>
                  {en.page_number != null && <span>· pág. {en.page_number}</span>}
                  <span className="ml-auto">{timeAgo(en.created_at)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{en.content}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Actions */}
      <div className="space-y-3">
        <Button fullWidth variant="secondary" onClick={() => setShareOpen(true)}>
          <Share2 size={16} strokeWidth={2} />
          Compartilhar conquista
        </Button>
        {userBook && (
          <Button
            fullWidth
            variant="danger"
            loading={deleting}
            onClick={deleteFromShelf}
          >
            Remover da estante
          </Button>
        )}
      </div>

      {/* Diary modal */}
      <Modal open={diaryOpen} onClose={() => setDiaryOpen(false)} title="Nova entrada">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {(["quote", "reflection", "note"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setEntryType(t)}
                className={
                  "flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-xs font-semibold transition " +
                  (entryType === t
                    ? "bg-primary text-on-primary shadow-neu"
                    : "bg-surface-light text-on-surface")
                }
              >
                <span className="text-xl">{ENTRY_EMOJI[t]}</span>
                {ENTRY_LABELS[t]}
              </button>
            ))}
          </div>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={entryPage}
            onChange={(e) => setEntryPage(e.target.value)}
            placeholder="Página (opcional)"
            className="w-full rounded-2xl bg-surface-light p-3 text-sm outline-none placeholder:text-on-surface-muted neu-inset"
          />
          <textarea
            value={entryContent}
            onChange={(e) => setEntryContent(e.target.value)}
            placeholder="Escreva sua citação, reflexão ou nota..."
            rows={5}
            className="w-full rounded-2xl bg-surface-light p-3 text-sm outline-none placeholder:text-on-surface-muted neu-inset"
          />
          <Button fullWidth loading={savingEntry} onClick={addEntry}>
            Adicionar
          </Button>
        </div>
      </Modal>

      {/* Share modal */}
      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Compartilhar">
        <ShareCardShell>
          <BookFinishedCard
            count={readCount}
            name={profile.full_name ?? "Leitor"}
            latestTitle={book.title}
          />
        </ShareCardShell>
      </Modal>
    </div>
  );
}
