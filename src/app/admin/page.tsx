"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/lib/hooks/useToast";
import { changeCredits } from "@/lib/gamification";
import { GENRES } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { FullPageSpinner } from "@/components/ui/Spinner";
import type {
  Book,
  Championship,
  LootboxType,
  Profile,
  RarityTier,
} from "@/types";

type Section = "books" | "championships" | "lootboxes" | "stats" | "users";

interface Stats {
  users: number;
  books: number;
  posts: number;
  totalXP: number;
}

const emptyBook = {
  title: "",
  author: "",
  cover_url: "",
  description: "",
  genre: GENRES[0],
  page_count: "",
  published_year: "",
  isbn: "",
  rarity_tier: "common" as RarityTier,
  gacha_weight: "1",
  price_credits: "0",
};

const emptyChamp = {
  title: "",
  description: "",
  start_date: "",
  end_date: "",
  prize_description: "",
};

const emptyLootbox = {
  name: "",
  description: "",
  genre_filter: "",
  cost_credits: "0",
  icon: "🎁",
  common: "70",
  rare: "25",
  legendary: "5",
};

export default function AdminPage() {
  const supabase = getSupabaseBrowser();
  const router = useRouter();
  const { toast } = useToast();

  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<Section>("books");

  const [books, setBooks] = useState<Book[]>([]);
  const [champs, setChamps] = useState<Championship[]>([]);
  const [lootboxes, setLootboxes] = useState<LootboxType[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [stats, setStats] = useState<Stats>({ users: 0, books: 0, posts: 0, totalXP: 0 });

  // book form
  const [bookModal, setBookModal] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [bookForm, setBookForm] = useState({ ...emptyBook });
  const [savingBook, setSavingBook] = useState(false);

  // champ form
  const [champForm, setChampForm] = useState({ ...emptyChamp });
  const [savingChamp, setSavingChamp] = useState(false);

  // lootbox form
  const [lootForm, setLootForm] = useState({ ...emptyLootbox });
  const [savingLoot, setSavingLoot] = useState(false);

  const [busy, setBusy] = useState<string | null>(null);
  const [creditInputs, setCreditInputs] = useState<Record<string, string>>({});

  // ---- Auth/admin guard ----
  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        router.replace("/login");
        return;
      }
      const { data: prof } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", sess.session.user.id)
        .single();
      if (!prof?.is_admin) {
        toast("Acesso restrito a administradores.", "error");
        router.replace("/app/dashboard");
        return;
      }
      setAuthChecked(true);
    })();
  }, [supabase, router, toast]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        booksRes,
        champsRes,
        lootRes,
        usersRes,
        userCount,
        bookCount,
        postCount,
        xpRes,
      ] = await Promise.all([
        supabase.from("books").select("*").order("created_at", { ascending: false }),
        supabase.from("championships").select("*").order("start_date", { ascending: false }),
        supabase.from("lootbox_types").select("*").order("cost_credits"),
        supabase
          .from("profiles")
          .select("*")
          .order("xp", { ascending: false })
          .limit(100),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("books").select("id", { count: "exact", head: true }),
        supabase.from("posts").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("xp"),
      ]);
      if (booksRes.error) throw booksRes.error;
      if (champsRes.error) throw champsRes.error;
      if (lootRes.error) throw lootRes.error;
      if (usersRes.error) throw usersRes.error;

      setBooks((booksRes.data as Book[]) ?? []);
      setChamps((champsRes.data as Championship[]) ?? []);
      setLootboxes((lootRes.data as LootboxType[]) ?? []);
      setUsers((usersRes.data as Profile[]) ?? []);

      const totalXP = ((xpRes.data as { xp: number }[]) ?? []).reduce(
        (s, r) => s + (r.xp || 0),
        0
      );
      setStats({
        users: userCount.count ?? 0,
        books: bookCount.count ?? 0,
        posts: postCount.count ?? 0,
        totalXP,
      });
    } catch (e: any) {
      setError(e.message || "Erro ao carregar dados de admin.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (authChecked) loadAll();
  }, [authChecked, loadAll]);

  // ---- Books ----
  function openNewBook() {
    setEditingBook(null);
    setBookForm({ ...emptyBook });
    setBookModal(true);
  }

  function openEditBook(b: Book) {
    setEditingBook(b);
    setBookForm({
      title: b.title,
      author: b.author,
      cover_url: b.cover_url ?? "",
      description: b.description ?? "",
      genre: b.genre ?? GENRES[0],
      page_count: b.page_count?.toString() ?? "",
      published_year: b.published_year?.toString() ?? "",
      isbn: b.isbn ?? "",
      rarity_tier: b.rarity_tier,
      gacha_weight: b.gacha_weight?.toString() ?? "1",
      price_credits: b.price_credits?.toString() ?? "0",
    });
    setBookModal(true);
  }

  async function saveBook() {
    if (!bookForm.title.trim() || !bookForm.author.trim()) {
      toast("Título e autor são obrigatórios.", "error");
      return;
    }
    setSavingBook(true);
    try {
      const payload = {
        title: bookForm.title.trim(),
        author: bookForm.author.trim(),
        cover_url: bookForm.cover_url.trim() || null,
        description: bookForm.description.trim() || null,
        genre: bookForm.genre || null,
        isbn: bookForm.isbn.trim() || null,
        page_count: bookForm.page_count ? Number(bookForm.page_count) : null,
        published_year: bookForm.published_year ? Number(bookForm.published_year) : null,
        rarity_tier: bookForm.rarity_tier,
        gacha_weight: Number(bookForm.gacha_weight) || 1,
        price_credits: Number(bookForm.price_credits) || 0,
      };
      if (editingBook) {
        const { error } = await supabase
          .from("books")
          .update(payload)
          .eq("id", editingBook.id);
        if (error) throw error;
        toast("Livro atualizado!", "success");
      } else {
        const { error } = await supabase.from("books").insert(payload);
        if (error) throw error;
        toast("Livro adicionado!", "success");
      }
      setBookModal(false);
      await loadAll();
    } catch (e: any) {
      toast(e.message || "Erro ao salvar livro.", "error");
    } finally {
      setSavingBook(false);
    }
  }

  async function deleteBook(b: Book) {
    if (!confirm(`Excluir "${b.title}"? Esta ação não pode ser desfeita.`)) return;
    setBusy(b.id);
    try {
      const { error } = await supabase.from("books").delete().eq("id", b.id);
      if (error) throw error;
      toast("Livro excluído.", "info");
      await loadAll();
    } catch (e: any) {
      toast(e.message || "Erro ao excluir.", "error");
    } finally {
      setBusy(null);
    }
  }

  // ---- Championships ----
  async function createChamp() {
    if (!champForm.title.trim() || !champForm.start_date || !champForm.end_date) {
      toast("Título, início e fim são obrigatórios.", "error");
      return;
    }
    setSavingChamp(true);
    try {
      const { error } = await supabase.from("championships").insert({
        title: champForm.title.trim(),
        description: champForm.description.trim() || null,
        start_date: new Date(champForm.start_date).toISOString(),
        end_date: new Date(champForm.end_date).toISOString(),
        prize_description: champForm.prize_description.trim() || null,
      });
      if (error) throw error;
      toast("Campeonato criado!", "success");
      setChampForm({ ...emptyChamp });
      await loadAll();
    } catch (e: any) {
      toast(e.message || "Erro ao criar campeonato.", "error");
    } finally {
      setSavingChamp(false);
    }
  }

  // ---- Lootboxes ----
  async function createLootbox() {
    if (!lootForm.name.trim()) {
      toast("Nome é obrigatório.", "error");
      return;
    }
    setSavingLoot(true);
    try {
      const { error } = await supabase.from("lootbox_types").insert({
        name: lootForm.name.trim(),
        description: lootForm.description.trim() || null,
        genre_filter: lootForm.genre_filter || null,
        cost_credits: Number(lootForm.cost_credits) || 0,
        icon: lootForm.icon || "🎁",
        rarity_chances: {
          common: Number(lootForm.common) || 0,
          rare: Number(lootForm.rare) || 0,
          legendary: Number(lootForm.legendary) || 0,
        },
      });
      if (error) throw error;
      toast("Caixa criada!", "success");
      setLootForm({ ...emptyLootbox });
      await loadAll();
    } catch (e: any) {
      toast(e.message || "Erro ao criar caixa.", "error");
    } finally {
      setSavingLoot(false);
    }
  }

  // ---- Users ----
  async function toggleAdmin(u: Profile) {
    setBusy(u.id);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_admin: !u.is_admin })
        .eq("id", u.id);
      if (error) throw error;
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, is_admin: !x.is_admin } : x))
      );
      toast(u.is_admin ? "Admin revogado." : "Admin concedido.", "success");
    } catch (e: any) {
      toast(e.message || "Erro ao atualizar.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function grantCredits(u: Profile) {
    const raw = creditInputs[u.id];
    const amount = Number(raw);
    if (!raw || !Number.isFinite(amount) || amount <= 0) {
      toast("Informe um valor válido.", "error");
      return;
    }
    setBusy(u.id);
    try {
      const result = await changeCredits(
        supabase as any,
        u.id,
        amount,
        "earn",
        "Admin grant"
      );
      if (result === null) throw new Error("Falha ao conceder créditos.");
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, credits: result } : x))
      );
      setCreditInputs((prev) => ({ ...prev, [u.id]: "" }));
      toast("Créditos concedidos!", "success");
    } catch (e: any) {
      toast(e.message || "Erro ao conceder créditos.", "error");
    } finally {
      setBusy(null);
    }
  }

  if (!authChecked) return <FullPageSpinner />;

  const sections: { key: Section; label: string }[] = [
    { key: "books", label: "Livros" },
    { key: "championships", label: "Campeonatos" },
    { key: "lootboxes", label: "Caixas" },
    { key: "stats", label: "Stats" },
    { key: "users", label: "Usuários" },
  ];

  const input =
    "w-full rounded-xl bg-surface-light px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <div className="mx-auto max-w-3xl px-5 py-8">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">Admin Readly</h1>
          <Link
            href="/app/dashboard"
            className="text-sm text-on-surface-muted hover:text-on-surface"
          >
            ← Voltar ao app
          </Link>
        </header>

        <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto">
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className={
                "shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition " +
                (section === s.key
                  ? "bg-primary text-on-primary"
                  : "bg-surface-light text-on-surface-muted")
              }
            >
              {s.label}
            </button>
          ))}
        </div>

        {loading ? (
          <FullPageSpinner />
        ) : error ? (
          <div className="py-10 text-center">
            <p className="mb-4 text-on-surface-muted">{error}</p>
            <Button onClick={loadAll}>Tentar novamente</Button>
          </div>
        ) : (
          <>
            {/* BOOKS */}
            {section === "books" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold">
                    Livros ({books.length})
                  </h2>
                  <Button size="sm" onClick={openNewBook}>
                    + Adicionar livro
                  </Button>
                </div>
                {books.map((b) => (
                  <Card key={b.id} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{b.title}</p>
                      <p className="truncate text-xs text-on-surface-muted">
                        {b.author} · {b.genre ?? "—"} · {b.rarity_tier} · 💰
                        {b.price_credits}
                      </p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => openEditBook(b)}>
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      loading={busy === b.id}
                      onClick={() => deleteBook(b)}
                    >
                      Excluir
                    </Button>
                  </Card>
                ))}
              </div>
            )}

            {/* CHAMPIONSHIPS */}
            {section === "championships" && (
              <div className="space-y-4">
                <Card className="space-y-3">
                  <h2 className="font-display text-lg font-bold">Novo campeonato</h2>
                  <input
                    className={input}
                    placeholder="Título"
                    value={champForm.title}
                    onChange={(e) =>
                      setChampForm({ ...champForm, title: e.target.value })
                    }
                  />
                  <textarea
                    className={input}
                    placeholder="Descrição"
                    value={champForm.description}
                    onChange={(e) =>
                      setChampForm({ ...champForm, description: e.target.value })
                    }
                  />
                  <label className="block text-xs text-on-surface-muted">Início</label>
                  <input
                    type="datetime-local"
                    className={input}
                    value={champForm.start_date}
                    onChange={(e) =>
                      setChampForm({ ...champForm, start_date: e.target.value })
                    }
                  />
                  <label className="block text-xs text-on-surface-muted">Fim</label>
                  <input
                    type="datetime-local"
                    className={input}
                    value={champForm.end_date}
                    onChange={(e) =>
                      setChampForm({ ...champForm, end_date: e.target.value })
                    }
                  />
                  <input
                    className={input}
                    placeholder="Descrição do prêmio"
                    value={champForm.prize_description}
                    onChange={(e) =>
                      setChampForm({ ...champForm, prize_description: e.target.value })
                    }
                  />
                  <Button loading={savingChamp} onClick={createChamp}>
                    Criar campeonato
                  </Button>
                </Card>

                <h2 className="font-display text-lg font-bold">
                  Existentes ({champs.length})
                </h2>
                {champs.map((c) => (
                  <Card key={c.id}>
                    <p className="font-bold">{c.title}</p>
                    <p className="text-xs text-on-surface-muted">
                      {new Date(c.start_date).toLocaleString("pt-BR")} →{" "}
                      {new Date(c.end_date).toLocaleString("pt-BR")}
                    </p>
                    {c.prize_description && (
                      <p className="text-xs text-on-surface-muted">
                        🏆 {c.prize_description}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            )}

            {/* LOOTBOXES */}
            {section === "lootboxes" && (
              <div className="space-y-4">
                <Card className="space-y-3">
                  <h2 className="font-display text-lg font-bold">Nova caixa</h2>
                  <input
                    className={input}
                    placeholder="Nome"
                    value={lootForm.name}
                    onChange={(e) => setLootForm({ ...lootForm, name: e.target.value })}
                  />
                  <textarea
                    className={input}
                    placeholder="Descrição"
                    value={lootForm.description}
                    onChange={(e) =>
                      setLootForm({ ...lootForm, description: e.target.value })
                    }
                  />
                  <div className="flex gap-2">
                    <input
                      className={input}
                      placeholder="Ícone (emoji)"
                      value={lootForm.icon}
                      onChange={(e) => setLootForm({ ...lootForm, icon: e.target.value })}
                    />
                    <input
                      type="number"
                      className={input}
                      placeholder="Custo"
                      value={lootForm.cost_credits}
                      onChange={(e) =>
                        setLootForm({ ...lootForm, cost_credits: e.target.value })
                      }
                    />
                  </div>
                  <select
                    className={input}
                    value={lootForm.genre_filter}
                    onChange={(e) =>
                      setLootForm({ ...lootForm, genre_filter: e.target.value })
                    }
                  >
                    <option value="">Todos os gêneros</option>
                    {GENRES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-on-surface-muted">Comum %</label>
                      <input
                        type="number"
                        className={input}
                        value={lootForm.common}
                        onChange={(e) =>
                          setLootForm({ ...lootForm, common: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-on-surface-muted">Raro %</label>
                      <input
                        type="number"
                        className={input}
                        value={lootForm.rare}
                        onChange={(e) =>
                          setLootForm({ ...lootForm, rare: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-on-surface-muted">Lendário %</label>
                      <input
                        type="number"
                        className={input}
                        value={lootForm.legendary}
                        onChange={(e) =>
                          setLootForm({ ...lootForm, legendary: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <Button loading={savingLoot} onClick={createLootbox}>
                    Criar caixa
                  </Button>
                </Card>

                <h2 className="font-display text-lg font-bold">
                  Existentes ({lootboxes.length})
                </h2>
                {lootboxes.map((l) => (
                  <Card key={l.id} className="flex items-center gap-3">
                    <span className="text-2xl">{l.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{l.name}</p>
                      <p className="text-xs text-on-surface-muted">
                        💰{l.cost_credits} · C{l.rarity_chances.common}/R
                        {l.rarity_chances.rare}/L{l.rarity_chances.legendary}
                        {l.genre_filter ? ` · ${l.genre_filter}` : ""}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* STATS */}
            {section === "stats" && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Usuários", value: stats.users, emoji: "👤" },
                  { label: "Livros", value: stats.books, emoji: "📚" },
                  { label: "Posts", value: stats.posts, emoji: "💬" },
                  {
                    label: "XP total",
                    value: stats.totalXP.toLocaleString("pt-BR"),
                    emoji: "⚡",
                  },
                ].map((s) => (
                  <Card key={s.label} className="text-center">
                    <div className="text-3xl">{s.emoji}</div>
                    <div className="font-display text-2xl font-bold">{s.value}</div>
                    <div className="text-xs text-on-surface-muted">{s.label}</div>
                  </Card>
                ))}
              </div>
            )}

            {/* USERS */}
            {section === "users" && (
              <div className="space-y-3">
                <h2 className="font-display text-lg font-bold">
                  Usuários ({users.length})
                </h2>
                {users.map((u) => (
                  <Card key={u.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-bold">
                          {u.full_name || "Sem nome"}{" "}
                          {u.is_admin && <Badge color="#E0B341">Admin</Badge>}
                        </p>
                        <p className="truncate text-xs text-on-surface-muted">
                          {u.id}
                        </p>
                        <p className="text-xs text-on-surface-muted">
                          ⚡{u.xp.toLocaleString("pt-BR")} XP · 💰{u.credits}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={u.is_admin ? "danger" : "secondary"}
                        loading={busy === u.id}
                        onClick={() => toggleAdmin(u)}
                      >
                        {u.is_admin ? "Revogar admin" : "Tornar admin"}
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        className={input}
                        placeholder="Conceder créditos"
                        value={creditInputs[u.id] ?? ""}
                        onChange={(e) =>
                          setCreditInputs((prev) => ({
                            ...prev,
                            [u.id]: e.target.value,
                          }))
                        }
                      />
                      <Button
                        size="sm"
                        disabled={busy === u.id}
                        onClick={() => grantCredits(u)}
                      >
                        Conceder
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Book modal */}
      <Modal
        open={bookModal}
        onClose={() => setBookModal(false)}
        title={editingBook ? "Editar livro" : "Adicionar livro"}
      >
        <div className="space-y-3">
          <input
            className={input}
            placeholder="Título"
            value={bookForm.title}
            onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
          />
          <input
            className={input}
            placeholder="Autor"
            value={bookForm.author}
            onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
          />
          <input
            className={input}
            placeholder="URL da capa"
            value={bookForm.cover_url}
            onChange={(e) => setBookForm({ ...bookForm, cover_url: e.target.value })}
          />
          <textarea
            className={input}
            placeholder="Descrição"
            value={bookForm.description}
            onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
          />
          <select
            className={input}
            value={bookForm.genre}
            onChange={(e) => setBookForm({ ...bookForm, genre: e.target.value })}
          >
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              className={input}
              placeholder="Páginas"
              value={bookForm.page_count}
              onChange={(e) => setBookForm({ ...bookForm, page_count: e.target.value })}
            />
            <input
              type="number"
              className={input}
              placeholder="Ano"
              value={bookForm.published_year}
              onChange={(e) =>
                setBookForm({ ...bookForm, published_year: e.target.value })
              }
            />
          </div>
          <input
            className={input}
            placeholder="ISBN"
            value={bookForm.isbn}
            onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
          />
          <select
            className={input}
            value={bookForm.rarity_tier}
            onChange={(e) =>
              setBookForm({ ...bookForm, rarity_tier: e.target.value as RarityTier })
            }
          >
            <option value="common">Comum</option>
            <option value="rare">Raro</option>
            <option value="legendary">Lendário</option>
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              className={input}
              placeholder="Gacha weight"
              value={bookForm.gacha_weight}
              onChange={(e) => setBookForm({ ...bookForm, gacha_weight: e.target.value })}
            />
            <input
              type="number"
              className={input}
              placeholder="Preço (créditos)"
              value={bookForm.price_credits}
              onChange={(e) =>
                setBookForm({ ...bookForm, price_credits: e.target.value })
              }
            />
          </div>
          <Button fullWidth loading={savingBook} onClick={saveBook}>
            {editingBook ? "Salvar alterações" : "Adicionar"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
