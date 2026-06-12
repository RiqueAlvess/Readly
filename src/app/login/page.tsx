"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/lib/hooks/useToast";

export default function LoginPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowser();
  const { toast } = useToast();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/app/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        toast("Conta criada! Verifique seu e-mail se necessário.", "success");
        router.replace("/app/dashboard");
      }
    } catch (err: any) {
      toast(err.message || "Falha na autenticação", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/app/dashboard` },
    });
    if (error) toast(error.message, "error");
  }

  return (
    <main className="flex min-h-screen flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/15 text-4xl shadow-glow">
            📚
          </div>
          <h1 className="font-display text-3xl font-bold">
            {mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
          </h1>
          <p className="mt-1 text-sm text-on-surface-muted">
            {mode === "login"
              ? "Entre para continuar sua jornada de leitura"
              : "Comece a ganhar XP e suba de rank"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === "signup" && (
            <input
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="neu-inset w-full rounded-2xl px-4 py-3.5 text-on-surface outline-none placeholder:text-on-surface-muted focus:ring-2 focus:ring-primary/50"
            />
          )}
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="neu-inset w-full rounded-2xl px-4 py-3.5 text-on-surface outline-none placeholder:text-on-surface-muted focus:ring-2 focus:ring-primary/50"
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="neu-inset w-full rounded-2xl px-4 py-3.5 text-on-surface outline-none placeholder:text-on-surface-muted focus:ring-2 focus:ring-primary/50"
          />
          <Button type="submit" loading={loading} fullWidth size="lg">
            {mode === "login" ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-on-surface-muted">
          <div className="h-px flex-1 bg-white/10" />
          ou
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <Button variant="secondary" fullWidth size="lg" onClick={handleGoogle}>
          <span>🔵</span> Continuar com Google
        </Button>

        <p className="mt-6 text-center text-sm text-on-surface-muted">
          {mode === "login" ? "Não tem conta?" : "Já tem conta?"}{" "}
          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="font-semibold text-primary"
          >
            {mode === "login" ? "Cadastre-se" : "Entrar"}
          </button>
        </p>
      </div>
    </main>
  );
}
