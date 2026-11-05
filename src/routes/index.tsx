/**
 * Página inicial (/) — apresenta o projeto e o problema real que ele resolve.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Agendou — agenda que nunca marca dois clientes no mesmo horário" },
      { name: "description", content: "Agenda com login e proteção contra agendamentos duplicados, mesmo com cliques simultâneos." },
      { property: "og:title", content: "Agendou — agenda sem horários duplicados" },
      { property: "og:description", content: "Proteção contra double-booking garantida pelo banco de dados." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <main className="min-h-screen paper-grid">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="flex items-center justify-between">
          <span className="font-display text-2xl font-extrabold">Agendou<span className="text-accent">.</span></span>
          <Button asChild variant="outline"><Link to="/login">Entrar</Link></Button>
        </header>

        <section className="mt-24 max-w-3xl">
          <p className="font-mono text-sm text-accent">// o problema real</p>
          <h1 className="mt-3 text-5xl font-extrabold leading-[1.05] md:text-7xl">
            Dois clientes. Mesmo horário. <span className="text-accent">Nunca mais.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Em barbearias, clínicas e consultórios, dois atendentes clicando "agendar" ao mesmo
            tempo criam horários duplicados. Checar no código não basta — as duas requisições
            passam pela checagem antes de qualquer uma salvar. Aqui quem garante é o banco.
          </p>
          <div className="mt-8 flex gap-3">
            <Button asChild size="lg"><Link to="/login">Abrir minha agenda</Link></Button>
          </div>
        </section>

        <section className="mt-24 grid gap-4 md:grid-cols-3">
          {[
            ["Constraint de exclusão", "Postgres rejeita intervalos sobrepostos de forma atômica (erro 23P01)."],
            ["Segurança por linha", "Cada usuário só lê e altera os próprios agendamentos (RLS)."],
            ["Fuso horário certo", "Tudo salvo em UTC, exibido no relógio local de quem acessa."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-lg border bg-card p-6">
              <h3 className="text-lg font-bold">{t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
