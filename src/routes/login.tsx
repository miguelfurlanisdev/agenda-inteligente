/**
 * Página de login/cadastro (/login).
 * Oferece e-mail+senha, Google e Lovable. Também tem "esqueci a senha".
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import "@lovable.dev/cloud-auth-js/styles.css";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Agendou" },
      { name: "description", content: "Entre ou crie sua conta para gerenciar sua agenda." },
      { property: "og:title", content: "Entrar — Agendou" },
      { property: "og:description", content: "Acesse sua agenda protegida contra horários duplicados." },
    ],
  }),
  component: LoginPage,
});

type Mode = "signin" | "signup" | "forgot";

function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // Se já está logado, vai direto para a agenda.
  useEffect(() => {
    if (user) navigate({ to: "/agenda" });
  }, [user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        // Cadastro: o nome vai em "data" e o gatilho do banco cria o perfil.
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/agenda", data: { display_name: name } },
        });
        if (error) throw error;
        // A conta só fica ativa depois de confirmar o e-mail.
        toast.success("Conta criada! Confira seu e-mail para confirmar.");
        setMode("signin");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        toast.success("Enviamos um link de redefinição para seu e-mail.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // O useEffect acima redireciona quando a sessão chega.
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setBusy(false);
    }
  }

  // Login social (Google / Lovable) — volta para a raiz do site após o provedor.
  async function social(provider: "google" | "lovable") {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/login" });
    if (result.error) toast.error("Não foi possível entrar com " + provider);
  }

  return (
    <main className="grid min-h-screen place-items-center paper-grid px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">
        <Link to="/" className="font-display text-xl font-extrabold">Agendou<span className="text-accent">.</span></Link>
        <h1 className="mt-6 text-2xl font-bold">
          {mode === "signin" ? "Entrar" : mode === "signup" ? "Criar conta" : "Recuperar senha"}
        </h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Seu nome</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {mode !== "forgot" && (
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Aguarde..." : mode === "signin" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link"}
          </Button>
        </form>

        {mode !== "forgot" && (
          <div className="mt-4 space-y-2">
            <Button type="button" variant="google" className="w-full" onClick={() => social("google")}>
              <GoogleLogo /> Continuar com Google
            </Button>
            <button type="button" className="lovable-auth-button w-full" onClick={() => social("lovable")}>
              Continue with Lovable
            </button>
          </div>
        )}

        <div className="mt-6 flex justify-between text-sm text-muted-foreground">
          {mode === "signin" ? (
            <>
              <button className="hover:text-foreground" onClick={() => setMode("signup")}>Criar conta</button>
              <button className="hover:text-foreground" onClick={() => setMode("forgot")}>Esqueci a senha</button>
            </>
          ) : (
            <button className="hover:text-foreground" onClick={() => setMode("signin")}>← Voltar para entrar</button>
          )}
        </div>
      </div>
    </main>
  );
}

/** Logo oficial do Google (cores originais, decorativo). */
function GoogleLogo() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.950-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.490-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
  );
}
