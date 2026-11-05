/**
 * Agenda (/agenda) — área logada.
 * - Lista os próximos agendamentos agrupados por dia
 * - Cria novos agendamentos
 * - Cancela agendamentos (libera o horário)
 * - Botão "Simular conflito": dispara DUAS gravações no mesmo horário ao mesmo
 *   tempo para demonstrar que o banco aceita só uma (o caso real do projeto).
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { friendlyDbError, toLocalDate, validateAppointment } from "@/lib/schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/agenda")({
  head: () => ({
    meta: [
      { title: "Minha agenda — Agendou" },
      { name: "description", content: "Seus próximos agendamentos." },
      { property: "og:title", content: "Minha agenda — Agendou" },
      { property: "og:description", content: "Gerencie seus horários sem conflitos." },
    ],
  }),
  component: AgendaPage,
});

/** Formato de uma linha da tabela appointments. */
type Appointment = {
  id: string;
  client_name: string;
  notes: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
};

/** Busca os agendamentos ativos a partir de hoje. A RLS garante que só vêm os do usuário logado. */
async function fetchAppointments(): Promise<Appointment[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from("appointments")
    .select("id, client_name, notes, starts_at, ends_at, status")
    .eq("status", "scheduled")
    .gte("starts_at", today.toISOString())
    .order("starts_at");
  if (error) throw error;
  return data;
}

function AgendaPage() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const qc = useQueryClient();

  // Proteção da rota: sem usuário logado, volta para o login.
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  // Lista de agendamentos (só busca quando há usuário).
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["appointments", user?.id],
    queryFn: fetchAppointments,
    enabled: !!user,
  });

  // Estado do formulário.
  const [form, setForm] = useState({
    clientName: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "09:00",
    duration: 30,
    notes: "",
  });

  /** Monta o registro a ser gravado a partir do formulário. */
  function buildRow() {
    const start = toLocalDate(form.date, form.time);
    const end = new Date(start.getTime() + form.duration * 60_000);
    return { start, end, row: { client_name: form.clientName.trim(), notes: form.notes || null, starts_at: start.toISOString(), ends_at: end.toISOString() } };
  }

  // Criar agendamento.
  const create = useMutation({
    mutationFn: async () => {
      const { start, row } = buildRow();
      const invalid = validateAppointment({ clientName: form.clientName, start, durationMin: form.duration });
      if (invalid) throw new Error(invalid);
      // Não checamos conflito aqui de propósito: quem decide é o banco (constraint no_overlap).
      const { error } = await supabase.from("appointments").insert(row);
      if (error) throw new Error(friendlyDbError(error));
    },
    onSuccess: () => {
      toast.success("Agendado!");
      setForm((f) => ({ ...f, clientName: "", notes: "" }));
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Cancelar: muda o status; a constraint ignora cancelados, então o horário fica livre.
  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
      if (error) throw new Error(friendlyDbError(error));
    },
    onSuccess: () => {
      toast("Agendamento cancelado");
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
  });

  /**
   * DEMONSTRAÇÃO DO CASO REAL: envia duas gravações idênticas em paralelo,
   * como dois atendentes clicando ao mesmo tempo. Resultado esperado: 1 sucesso, 1 bloqueio.
   */
  async function simulateRace() {
    const { start, row } = buildRow();
    const invalid = validateAppointment({ clientName: form.clientName || "Teste", start, durationMin: form.duration });
    if (invalid) {
      toast.error(invalid);
      return;
    }
    const r = { ...row, client_name: row.client_name || "Teste concorrência" };
    const results = await Promise.all([
      supabase.from("appointments").insert({ ...r, client_name: r.client_name + " (A)" }),
      supabase.from("appointments").insert({ ...r, client_name: r.client_name + " (B)" }),
    ]);
    const ok = results.filter((x) => !x.error).length;
    const blocked = results.filter((x) => x.error?.code === "23P01").length;
    toast.info(`Duas requisições simultâneas: ${ok} gravada(s), ${blocked} bloqueada(s) pelo banco.`);
    qc.invalidateQueries({ queryKey: ["appointments"] });
  }

  // Agrupa os itens por dia para exibição.
  const groups = useMemo(() => {
    const out: { day: Date; list: Appointment[] }[] = [];
    for (const a of items) {
      const d = new Date(a.starts_at);
      const last = out.at(-1);
      if (last && isSameDay(last.day, d)) last.list.push(a);
      else out.push({ day: d, list: [a] });
    }
    return out;
  }, [items]);

  if (loading || !user) return null;

  return (
    <main className="min-h-screen">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="font-display text-xl font-extrabold">Agendou<span className="text-accent">.</span></span>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{user.email}</span>
            <Button variant="outline" size="sm" onClick={() => signOut()}>Sair</Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-8 px-6 py-10 md:grid-cols-[340px_1fr]">
        {/* Formulário de novo agendamento */}
        <form
          onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
          className="h-fit space-y-4 rounded-xl border bg-card p-6"
        >
          <h2 className="text-xl font-bold">Novo agendamento</h2>
          <div className="space-y-1.5">
            <Label htmlFor="client">Cliente</Label>
            <Input id="client" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date">Data</Label>
              <Input id="date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="time">Hora</Label>
              <Input id="time" type="time" step={900} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dur">Duração (min)</Label>
            <Input id="dur" type="number" min={15} max={480} step={15} value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" maxLength={500} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <Button type="submit" className="w-full" disabled={create.isPending}>
            {create.isPending ? "Salvando..." : "Agendar"}
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={simulateRace}>
            Simular 2 cliques simultâneos
          </Button>
        </form>

        {/* Lista agrupada por dia */}
        <section>
          <h2 className="text-xl font-bold">Próximos horários</h2>
          {isLoading && <p className="mt-4 text-muted-foreground">Carregando...</p>}
          {!isLoading && groups.length === 0 && (
            <p className="mt-4 rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              Nenhum agendamento ainda. Crie o primeiro ao lado.
            </p>
          )}
          <div className="mt-4 space-y-6">
            {groups.map((g) => (
              <div key={g.day.toISOString()}>
                <h3 className="mb-2 font-mono text-sm uppercase text-accent">
                  {format(g.day, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </h3>
                <ul className="space-y-2">
                  {g.list.map((a) => (
                    <li key={a.id} className="flex items-start justify-between gap-4 rounded-lg border bg-card p-4">
                      <div>
                        <p className="font-mono text-sm text-muted-foreground">
                          {format(new Date(a.starts_at), "HH:mm")} – {format(new Date(a.ends_at), "HH:mm")}
                        </p>
                        <p className="font-semibold">{a.client_name}</p>
                        {a.notes && <p className="mt-1 text-sm text-muted-foreground">{a.notes}</p>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => cancel.mutate(a.id)}>Cancelar</Button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
