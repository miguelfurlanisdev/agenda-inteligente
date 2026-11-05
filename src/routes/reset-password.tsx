/**
 * Página de nova senha (/reset-password).
 * O usuário chega aqui pelo link do e-mail de recuperação, já com uma sessão
 * temporária; basta definir a nova senha.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha — Agendou" },
      { name: "description", content: "Defina uma nova senha para sua conta." },
      { property: "og:title", content: "Nova senha — Agendou" },
      { property: "og:description", content: "Redefina sua senha do Agendou." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return toast.error(error.message);
    toast.success("Senha atualizada!");
    navigate({ to: "/agenda" });
  }

  return (
    <main className="grid min-h-screen place-items-center paper-grid px-4">
      <form onSubmit={save} className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-8">
        <h1 className="text-2xl font-bold">Definir nova senha</h1>
        <div className="space-y-1.5">
          <Label htmlFor="pw">Nova senha</Label>
          <Input id="pw" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full">Salvar</Button>
      </form>
    </main>
  );
}
