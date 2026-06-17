"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useProfileContext } from "@/lib/hooks/profileContext";
import { useToast } from "@/lib/hooks/useToast";
import { GENRES } from "@/lib/constants";
import { timeAgo } from "@/lib/utils/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FullPageSpinner } from "@/components/ui/Spinner";
import type { UserBookSubmission } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  pending: "#E0B341",
  approved: "#8FB98F",
  rejected: "#D4A89C",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
};

const empty = {
  title: "",
  author: "",
  cover_url: "",
  description: "",
  genre: GENRES[0],
  isbn: "",
  page_count: "",
  published_year: "",
};

export default function SubmissoesPage() {
  const supabase = getSupabaseBrowser();
  const { profile } = useProfileContext();
  const { toast } = useToast();

  const [submissions, setSubmissions] = useState<UserBookSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...empty });
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_book_submissions")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSubmissions((data as UserBookSubmission[]) ?? []);
    } catch (e: any) {
      toast(e.message || "Erro ao carregar submissões.", "error");
    } finally {
      setLoading(false);
    }
  }, [profile, supabase, toast]);

  useEffect(() => {
    if (profile) load();
  }, [profile, load]);

  async function submit() {
    if (!profile) return;
    if (!form.title.trim() || !form.author.trim()) {
      toast("Título e autor são obrigatórios.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("user_book_submissions").insert({
        user_id: profile.id,
        title: form.title.trim(),
        author: form.author.trim(),
        cover_url: form.cover_url.trim() || null,
        description: form.description.trim() || null,
        genre: form.genre || null,
        isbn: form.isbn.trim() || null,
        page_count: form.page_count ? Number(form.page_count) : null,
        published_year: form.published_year ? Number(form.published_year) : null,
        status: "pending",
      });
      if (error) throw error;
      toast("Livro enviado para análise! 📚", "success");
      setForm({ ...empty });
      setShowForm(false);
      await load();
    } catch (e: any) {
      toast(e.message || "Erro ao enviar.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!profile || loading) return <FullPageSpinner />;

  const input =
    "w-full rounded-xl bg-surface-light px-3 py-2.5 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-on-surface-muted";

  return (
    <div className="space-y-5 pt-2 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Sugerir Livro</h1>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancelar" : "+ Nova sugestão"}
        </Button>
      </div>

      <p className="text-sm text-on-surface-muted">
        Sugira livros que ainda não estão no catálogo. Nossa equipe analisará e adicionará os
        aprovados.
      </p>

      {showForm && (
        <Card className="space-y-3">
          <h2 className="font-display text-lg font-bold">Nova sugestão</h2>
          <input
            className={input}
            placeholder="Título *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            className={input}
            placeholder="Autor *"
            value={form.author}
            onChange={(e) => setForm({ ...form, author: e.target.value })}
          />
          <input
            className={input}
            placeholder="URL da capa (opcional)"
            value={form.cover_url}
            onChange={(e) => setForm({ ...form, cover_url: e.target.value })}
          />
          <textarea
            className={input}
            placeholder="Descrição (opcional)"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <select
            className={input}
            value={form.genre}
            onChange={(e) => setForm({ ...form, genre: e.target.value })}
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
              value={form.page_count}
              onChange={(e) => setForm({ ...form, page_count: e.target.value })}
            />
            <input
              type="number"
              className={input}
              placeholder="Ano"
              value={form.published_year}
              onChange={(e) => setForm({ ...form, published_year: e.target.value })}
            />
          </div>
          <input
            className={input}
            placeholder="ISBN (opcional)"
            value={form.isbn}
            onChange={(e) => setForm({ ...form, isbn: e.target.value })}
          />
          <Button fullWidth loading={submitting} onClick={submit}>
            Enviar sugestão
          </Button>
        </Card>
      )}

      {submissions.length === 0 ? (
        <Card className="text-center text-sm text-on-surface-muted">
          Você ainda não enviou nenhuma sugestão.
        </Card>
      ) : (
        <div className="space-y-3">
          <h2 className="font-display text-lg font-bold">Suas sugestões</h2>
          {submissions.map((s) => (
            <Card key={s.id} className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-bold">{s.title}</p>
                  <p className="truncate text-sm text-on-surface-muted">{s.author}</p>
                </div>
                <Badge color={STATUS_COLORS[s.status]}>
                  {STATUS_LABELS[s.status]}
                </Badge>
              </div>
              {s.admin_note && (
                <p className="rounded-lg bg-surface-light px-3 py-2 text-xs text-on-surface-muted">
                  Nota: {s.admin_note}
                </p>
              )}
              <p className="text-xs text-on-surface-muted">
                Enviado {timeAgo(s.created_at)}
                {s.reviewed_at && ` · Revisado ${timeAgo(s.reviewed_at)}`}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
