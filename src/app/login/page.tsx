"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { Library } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/lib/hooks/useToast";

/* ─── Supabase error → mensagem amigável em PT-BR ─── */
function friendlyError(msg: string): string {
  if (msg.includes("Invalid login credentials"))
    return "E-mail ou senha incorretos.";
  if (msg.includes("Email not confirmed"))
    return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.";
  if (msg.includes("User already registered"))
    return "Já existe uma conta com este e-mail. Faça login.";
  if (msg.includes("Password should be"))
    return "A senha deve ter pelo menos 6 caracteres.";
  if (msg.includes("Unable to validate email"))
    return "E-mail inválido. Verifique e tente novamente.";
  if (msg.includes("signup_disabled"))
    return "Cadastro desativado temporariamente.";
  if (msg.includes("rate limit") || msg.includes("too many"))
    return "Muitas tentativas. Aguarde alguns minutos.";
  return msg;
}

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowser();
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/app/dashboard");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;

        // Supabase retorna identities=[] quando o e-mail já está cadastrado
        if (data.user && data.user.identities?.length === 0) {
          throw new Error("User already registered");
        }

        // Se confirmação de e-mail estiver DESATIVADA no Supabase, a sessão
        // já existe e podemos entrar direto. Caso contrário, fazemos login.
        if (data.session) {
          toast("Conta criada com sucesso! Bem-vindo(a)!", "success");
          router.replace("/app/dashboard");
        } else {
          // Confirmação de email ativada — tenta login após cadastro
          const { error: loginErr } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (loginErr) {
            // Confirmação pendente
            toast(
              "Conta criada! Verifique seu e-mail para confirmar e depois faça login.",
              "success"
            );
            setMode("login");
            setPassword("");
          } else {
            toast("Conta criada com sucesso!", "success");
            router.replace("/app/dashboard");
          }
        }
      }
    } catch (err: any) {
      toast(friendlyError(err.message ?? "Falha na autenticação"), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        {/* Logo / cabeçalho */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/15">
            <Library size={40} className="text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-bold text-on-surface">
            {mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
          </h1>
          <p className="mt-1 text-sm text-on-surface/60">
            {mode === "login"
              ? "Entre para continuar sua jornada de leitura"
              : "Comece a ganhar XP e suba de rank"}
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === "signup" && (
            <input
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              className="w-full rounded-2xl bg-surface-variant px-4 py-3.5 text-on-surface outline-none placeholder:text-on-surface/40 focus:ring-2 focus:ring-primary/50"
            />
          )}
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-2xl bg-surface-variant px-4 py-3.5 text-on-surface outline-none placeholder:text-on-surface/40 focus:ring-2 focus:ring-primary/50"
          />
          <input
            type="password"
            placeholder="Senha (mín. 6 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="w-full rounded-2xl bg-surface-variant px-4 py-3.5 text-on-surface outline-none placeholder:text-on-surface/40 focus:ring-2 focus:ring-primary/50"
          />

          <Button type="submit" loading={loading} fullWidth size="lg" className="mt-1">
            {mode === "login" ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        {/* Troca de modo */}
        <p className="mt-6 text-center text-sm text-on-surface/60">
          {mode === "login" ? "Não tem conta?" : "Já tem conta?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setPassword("");
            }}
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            {mode === "login" ? "Cadastre-se grátis" : "Entrar"}
          </button>
        </p>
      </div>
    </main>
  );
}
