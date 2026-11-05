/**
 * Regras de negócio da agenda (funções puras, sem React nem banco).
 * Ficam isoladas aqui para poderem ser testadas em src/lib/schedule.test.ts.
 */

/** Um intervalo de tempo [início, fim) — o fim NÃO pertence ao intervalo. */
export interface Interval {
  start: Date;
  end: Date;
}

/**
 * Dois intervalos se sobrepõem quando um começa antes do outro terminar.
 * Como o fim é exclusivo, 09:00–10:00 e 10:00–11:00 NÃO conflitam
 * (horários "colados" são permitidos).
 */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Junta data ("2026-11-05") + hora ("14:30") digitadas pelo usuário em um Date
 * no fuso horário LOCAL do navegador. O banco guarda em UTC (timestamptz),
 * então quem está em São Paulo e quem está em Lisboa veem o mesmo instante
 * convertido para o seu relógio.
 */
export function toLocalDate(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

/** Valida um novo agendamento antes de enviar ao servidor. Retorna a mensagem de erro ou null. */
export function validateAppointment(
  input: { clientName: string; start: Date; durationMin: number },
  now: Date = new Date(),
): string | null {
  if (input.clientName.trim().length < 2) return "Informe o nome do cliente.";
  if (Number.isNaN(input.start.getTime())) return "Data ou hora inválida.";
  if (input.start < now) return "Não é possível agendar no passado.";
  if (input.durationMin < 15 || input.durationMin > 480) return "Duração deve ser entre 15 min e 8 h.";
  return null;
}

/**
 * Traduz erros do banco em mensagens amigáveis.
 * 23P01 = "exclusion_violation": a constraint `no_overlap` barrou um horário duplicado.
 * Esse é o código que prova que a proteção funciona MESMO com dois cliques simultâneos.
 */
export function friendlyDbError(error: { code?: string; message?: string } | null): string {
  if (!error) return "";
  if (error.code === "23P01") return "Esse horário já está ocupado por outro agendamento.";
  if (error.code === "23514") return "Dados inválidos (verifique horários e campos).";
  return error.message ?? "Erro inesperado.";
}
