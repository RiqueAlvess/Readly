"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useProfileContext } from "@/lib/hooks/profileContext";
import { useToast } from "@/lib/hooks/useToast";
import { awardXP } from "@/lib/gamification";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { BookCover } from "@/components/books/BookCover";
import { EMOJI_PICKER } from "@/lib/constants";
import type { Collection, Book } from "@/types";

interface CollectionWithCount extends Collection {
  book_count: number;
}

export default function CollectionsPage() {
  const supabase = getSupabaseBrowser();
  const { profile, reload } = useProfileContext();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<CollectionWithCount[]>([]);

  // create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(EMOJI_PICKER[0]);
  const [creating, setCreating] = useState(false);

  // view/detail modal
  const [active, setActive] = useState<CollectionWithCount | null>(null);
  const [detailBooks, setDetailBooks] = useState<Book[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const userId = profile?.id ?? null;

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const list = (data as Collection[]) ?? [];
      const withCounts = await Promise.all(
        list.map(async (c) => {
          const { count } = await supabase
            .from("collection_books")
            .select("book_id", { count: "exact", head: true })
            .eq("collection_id", c.id);
          return { ...c, book_count: count ?? 0 };
        })
      );
      setCollections(withCounts);
    } catch (e) {
      console.error(e);
      toast("Erro ao carregar coleções", "error");
    } finally {
      setLoading(false);
    }
  }, [supabase, userId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  // ---- Create collection ----
  async function createCollection() {
    if (!userId) return;
    if (!name.trim()) {
      toast("Dê um nome à coleção", "info");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("collections")
        .insert({ user_id: userId, name: name.trim(), emoji })
        .select("*")
        .single();
      if (error) throw error;

      setCollections((prev) => [{ ...(data as Collection), book_count: 0 }, ...prev]);
      setName("");
      setEmoji(EMOJI_PICKER[0]);
      setCreateOpen(false);
      await awardXP(supabase as any, userId, "collection_created", (data as Collection).id);
      await reload();
      toast("Coleção criada! +30 XP", "xp");
    } catch (e) {
      console.error(e);
      toast("Erro ao criar coleção", "error");
    } finally {
      setCreating(false);
    }
  }

  // ---- Open detail ----
  async function openDetail(c: CollectionWithCount) {
    setActive(c);
    setDetailLoading(true);
    setDetailBooks([]);
    try {
      const { data, error } = await supabase
        .from("collection_books")
        .select("book:books(*)")
        .eq("collection_id", c.id);
      if (error) throw error;
      const rows = (data as unknown as { book: Book | Book[] | null }[]) ?? [];
      const books = rows
        .map((r) => (Array.isArray(r.book) ? r.book[0] : r.book))
        .filter((b): b is Book => !!b);
      setDetailBooks(books);
    } catch (e) {
      console.error(e);
      toast("Erro ao carregar livros", "error");
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setActive(null);
    setDetailBooks([]);
  }

  // ---- Remove book from collection ----
  async function removeBook(bookId: string) {
    if (!active) return;
    try {
      const { error } = await supabase
        .from("collection_books")
        .delete()
        .eq("collection_id", active.id)
        .eq("book_id", bookId);
      if (error) throw error;
      setDetailBooks((prev) => prev.filter((b) => b.id !== bookId));
      setCollections((prev) =>
        prev.map((c) =>
          c.id === active.id ? { ...c, book_count: Math.max(0, c.book_count - 1) } : c
        )
      );
      toast("Livro removido da coleção", "success");
    } catch (e) {
      console.error(e);
      toast("Erro ao remover livro", "error");
    }
  }

  // ---- Delete collection ----
  async function deleteCollection() {
    if (!active) return;
    if (!window.confirm(`Excluir a coleção "${active.name}"?`)) return;
    try {
      await supabase.from("collection_books").delete().eq("collection_id", active.id);
      const { error } = await supabase.from("collections").delete().eq("id", active.id);
      if (error) throw error;
      setCollections((prev) => prev.filter((c) => c.id !== active.id));
      closeDetail();
      toast("Coleção excluída", "success");
    } catch (e) {
      console.error(e);
      toast("Erro ao excluir coleção", "error");
    }
  }

  if (loading || !profile) return <FullPageSpinner />;

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Coleções</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          + Nova coleção
        </Button>
      </div>

      {collections.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
          <div className="text-5xl">🗂️</div>
          <p className="text-on-surface-muted">
            Você ainda não tem coleções.
            <br />
            Crie uma para organizar seus livros.
          </p>
          <Button onClick={() => setCreateOpen(true)}>+ Nova coleção</Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {collections.map((c) => (
            <button
              key={c.id}
              onClick={() => openDetail(c)}
              className="text-left"
            >
              <Card className="flex h-full flex-col gap-1.5">
                <span className="text-4xl">{c.emoji}</span>
                <span className="line-clamp-2 font-display font-bold leading-tight">
                  {c.name}
                </span>
                <span className="text-xs text-on-surface-muted">
                  {c.book_count} {c.book_count === 1 ? "livro" : "livros"}
                </span>
              </Card>
            </button>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nova coleção">
        <div className="space-y-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome da coleção"
            className="w-full rounded-2xl bg-surface-light p-3 text-sm outline-none placeholder:text-on-surface-muted/60"
          />
          <div>
            <p className="mb-2 text-sm text-on-surface-muted">Emoji</p>
            <div className="grid grid-cols-6 gap-2">
              {EMOJI_PICKER.map((em) => {
                const selected = em === emoji;
                return (
                  <button
                    key={em}
                    onClick={() => setEmoji(em)}
                    className={
                      "flex aspect-square items-center justify-center rounded-xl text-xl transition " +
                      (selected
                        ? "bg-primary/30 ring-2 ring-primary"
                        : "bg-surface-light hover:bg-surface-light/70")
                    }
                  >
                    {em}
                  </button>
                );
              })}
            </div>
          </div>
          <Button fullWidth loading={creating} onClick={createCollection}>
            Criar coleção
          </Button>
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal
        open={!!active}
        onClose={closeDetail}
        title={active ? `${active.emoji} ${active.name}` : ""}
      >
        {detailLoading ? (
          <div className="py-8 text-center text-on-surface-muted">Carregando...</div>
        ) : detailBooks.length === 0 ? (
          <p className="py-6 text-center text-sm text-on-surface-muted">
            Nenhum livro nesta coleção ainda.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {detailBooks.map((b) => (
              <div key={b.id} className="space-y-1.5">
                <Link href={`/app/livro/${b.id}`} onClick={closeDetail}>
                  <BookCover url={b.cover_url} title={b.title} author={b.author} />
                </Link>
                <button
                  onClick={() => removeBook(b.id)}
                  className="w-full rounded-lg bg-red-900/40 py-1 text-[11px] font-semibold text-red-100 transition hover:bg-red-900/60"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 border-t border-white/10 pt-4">
          <Button variant="danger" fullWidth onClick={deleteCollection}>
            Excluir coleção
          </Button>
        </div>
      </Modal>
    </div>
  );
}
