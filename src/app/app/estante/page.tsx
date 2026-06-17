"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useProfileContext } from "@/lib/hooks/profileContext";
import { useToast } from "@/lib/hooks/useToast";
import { STATUS_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Spinner, FullPageSpinner } from "@/components/ui/Spinner";
import { BookCover } from "@/components/books/BookCover";
import type { UserBook, Book, BookStatus } from "@/types";

type FilterKey = "all" | BookStatus | "favorites";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "reading", label: "Lendo" },
  { key: "read", label: "Lidos" },
  { key: "want_to_read", label: "Quero Ler" },
  { key: "abandoned", label: "Abandonados" },
  { key: "favorites", label: "Favoritos" },
];

export default function EstantePage() {
  const supabase = getSupabaseBrowser();
  const { profile } = useProfileContext();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [library, setLibrary] = useState<UserBook[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  // Add-book modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogResults, setCatalogResults] = useState<Book[]>([]);
  const [searchingCatalog, setSearchingCatalog] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const loadLibrary = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_books")
        .select("*, book:books(*)")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setLibrary((data as UserBook[]) ?? []);
    } catch (e) {
      console.error(e);
      toast("Erro ao carregar sua estante.", "error");
    } finally {
      setLoading(false);
    }
  }, [profile, supabase, toast]);

  useEffect(() => {
    if (profile) loadLibrary();
  }, [profile, loadLibrary]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return library.filter((ub) => {
      if (filter === "favorites" && !ub.is_favorite) return false;
      if (filter !== "all" && filter !== "favorites" && ub.status !== filter) return false;
      if (q) {
        const title = ub.book?.title?.toLowerCase() ?? "";
        const author = ub.book?.author?.toLowerCase() ?? "";
        if (!title.includes(q) && !author.includes(q)) return false;
      }
      return true;
    });
  }, [library, search, filter]);

  // Catalog search (debounced)
  useEffect(() => {
    if (!modalOpen) return;
    const q = catalogQuery.trim();
    if (q.length < 2) {
      setCatalogResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearchingCatalog(true);
      try {
        const { data, error } = await supabase
          .from("books")
          .select("*")
          .ilike("title", `%${q}%`)
          .limit(20);
        if (error) throw error;
        setCatalogResults((data as Book[]) ?? []);
      } catch (e) {
        console.error(e);
        toast("Erro ao buscar no catálogo.", "error");
      } finally {
        setSearchingCatalog(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [catalogQuery, modalOpen, supabase, toast]);

  const addBook = async (book: Book) => {
    if (!profile) return;
    setAddingId(book.id);
    try {
      const { error } = await supabase.from("user_books").insert({
        user_id: profile.id,
        book_id: book.id,
        status: "want_to_read",
      });
      if (error) {
        // Unique violation on (user_id, book_id)
        if (error.code === "23505") {
          toast("Este livro já está na sua estante.", "info");
        } else {
          throw error;
        }
      } else {
        toast(`"${book.title}" adicionado!`, "success");
        await loadLibrary();
      }
    } catch (e) {
      console.error(e);
      toast("Erro ao adicionar o livro.", "error");
    } finally {
      setAddingId(null);
    }
  };

  if (!profile || loading) return <FullPageSpinner />;

  return (
    <div className="flex flex-col gap-4 px-4 pb-28 pt-6">
      <h1 className="font-display text-3xl font-bold text-on-surface">Estante</h1>

      {/* 1. Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por título ou autor..."
        className="neu-inset w-full rounded-xl bg-surface px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-muted focus:outline-none focus:ring-1 focus:ring-primary"
      />

      {/* 2. Filter pills */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition " +
              (filter === f.key
                ? "bg-primary text-on-primary"
                : "bg-surface-light text-on-surface-muted")
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 3. Grid */}
      {filtered.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-white/5 bg-surface p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Plus size={28} className="text-primary" strokeWidth={1.5} />
          </div>
          <p className="font-semibold text-on-surface">
            {library.length === 0 ? "Estante vazia" : "Nenhum resultado"}
          </p>
          <p className="text-sm text-on-surface/50">
            {library.length === 0
              ? "Toque no + para adicionar seu primeiro livro."
              : "Tente outro filtro ou busca."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {filtered.map((ub) => (
            <div key={ub.id} className="relative">
              <Link href={`/app/livro/${ub.book_id}`}>
                <BookCover
                  url={ub.book?.cover_url}
                  title={ub.book?.title ?? "Livro"}
                  author={ub.book?.author}
                />
              </Link>
              <div className="absolute left-1 top-1">
                <Badge className="!px-1.5 !py-0 !text-[10px]">
                  {STATUS_LABELS[ub.status]}
                </Badge>
              </div>
              {ub.is_favorite && (
                <span className="absolute right-1 top-1 text-sm drop-shadow">❤️</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 4. Floating add button */}
      <button
        onClick={() => setModalOpen(true)}
        className="fixed bottom-36 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg active:scale-95 transition-transform"
        style={{ boxShadow: "0 4px 24px rgba(152,189,168,0.4)" }}
        aria-label="Adicionar livro"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Adicionar Livro">
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={catalogQuery}
            onChange={(e) => setCatalogQuery(e.target.value)}
            placeholder="Buscar no catálogo por título..."
            autoFocus
            className="neu-inset w-full rounded-xl bg-surface px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-muted focus:outline-none focus:ring-1 focus:ring-primary"
          />

          {searchingCatalog ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : catalogQuery.trim().length < 2 ? (
            <p className="py-4 text-center text-sm text-on-surface-muted">
              Digite ao menos 2 caracteres para buscar.
            </p>
          ) : catalogResults.length === 0 ? (
            <p className="py-4 text-center text-sm text-on-surface-muted">
              Nenhum livro encontrado no catálogo.
            </p>
          ) : (
            <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
              {catalogResults.map((book) => (
                <div
                  key={book.id}
                  className="neu-inset flex items-center gap-3 rounded-xl p-2"
                >
                  <div className="w-10 shrink-0">
                    <BookCover
                      url={book.cover_url}
                      title={book.title}
                      author={book.author}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-on-surface">
                      {book.title}
                    </p>
                    <p className="truncate text-xs text-on-surface-muted">
                      {book.author}
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={addingId === book.id}
                    onClick={() => addBook(book)}
                  >
                    Adicionar
                  </Button>
                </div>
              ))}
            </div>
          )}

          <p className="pt-1 text-center text-xs text-on-surface-muted">
            Não encontrou o livro? Apenas administradores podem adicionar novos
            títulos ao catálogo.
          </p>
        </div>
      </Modal>
    </div>
  );
}
