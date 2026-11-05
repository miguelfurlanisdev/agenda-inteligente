# Agendou — agenda sem horários duplicados

Agenda com login onde **é impossível marcar dois clientes no mesmo horário**, mesmo quando duas pessoas clicam "agendar" ao mesmo tempo.

## O problema real (double-booking / race condition)

Em barbearias, clínicas e consultórios, a solução ingênua é:

1. Buscar no banco se o horário está livre
2. Se estiver, salvar

Com dois atendentes clicando juntos, **as duas requisições passam pelo passo 1 antes de qualquer uma chegar ao passo 2** — resultado: dois clientes no mesmo horário.

**Solução:** a regra mora no banco, numa *exclusion constraint* do PostgreSQL:

```sql
CONSTRAINT no_overlap EXCLUDE USING gist (
  user_id WITH =,
  tstzrange(starts_at, ends_at, '[)') WITH &&
) WHERE (status = 'scheduled')
```

- `&&` = "intervalos se sobrepõem"; `'[)'` = o fim não conta, então 9h–10h e 10h–11h podem coexistir
- É atômico: o banco aceita uma gravação e rejeita a outra com erro `23P01`
- Agendamentos cancelados ficam fora da regra (o horário é liberado)

Na tela da agenda o botão **"Simular 2 cliques simultâneos"** prova isso ao vivo.

## Funcionalidades

- Login com e-mail/senha, Google e Lovable; recuperação de senha
- Criar, listar (por dia) e cancelar agendamentos
- Cada usuário só vê os próprios dados (Row Level Security)
- Datas salvas em UTC e exibidas no fuso local

## Estrutura de pastas

```
drizzle/migrations/       SQL do banco (tabelas, constraint, segurança RLS)
src/
  routes/                 Páginas (cada arquivo = uma URL)
    index.tsx             /                Página inicial
    login.tsx             /login           Entrar, cadastrar, esqueci a senha
    reset-password.tsx    /reset-password  Definir nova senha
    agenda.tsx            /agenda          Área logada com a agenda
    __root.tsx            Layout geral, fontes, notificações
  hooks/useAuth.tsx       Sessão do usuário logado
  lib/schedule.ts         Regras de negócio puras (sobreposição, validação, erros)
  lib/schedule.test.ts    Testes dessas regras
  components/ui/          Componentes visuais (botões, inputs...)
  integrations/           Clientes de backend gerados automaticamente (não editar)
  styles.css              Design system: cores, fontes, tokens
```

## Stack

React 19 · TanStack Start/Router/Query · TypeScript · Tailwind CSS v4 · PostgreSQL (Lovable Cloud) · Vitest

## Rodando

```bash
bun install
bun run dev
bunx vitest run   # testes
```
