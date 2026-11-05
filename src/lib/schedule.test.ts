// Testes das regras da agenda. Rode com: bunx vitest run
import { describe, expect, it } from "vitest";
import { friendlyDbError, overlaps, toLocalDate, validateAppointment } from "./schedule";

const at = (h: number, m = 0) => new Date(2030, 0, 10, h, m);

describe("overlaps", () => {
  it("detecta conflito quando os horários se cruzam", () => {
    expect(overlaps({ start: at(9), end: at(10) }, { start: at(9, 30), end: at(10, 30) })).toBe(true);
  });
  it("permite horários colados (10:00 termina, 10:00 começa)", () => {
    expect(overlaps({ start: at(9), end: at(10) }, { start: at(10), end: at(11) })).toBe(false);
  });
});

describe("validateAppointment", () => {
  const now = at(8);
  it("bloqueia agendamento no passado", () => {
    expect(validateAppointment({ clientName: "Ana", start: at(7), durationMin: 30 }, now)).not.toBeNull();
  });
  it("bloqueia duração menor que 15 minutos", () => {
    expect(validateAppointment({ clientName: "Ana", start: at(9), durationMin: 10 }, now)).not.toBeNull();
  });
  it("aceita um agendamento válido", () => {
    expect(validateAppointment({ clientName: "Ana", start: at(9), durationMin: 30 }, now)).toBeNull();
  });
});

describe("friendlyDbError / toLocalDate", () => {
  it("traduz o erro de horário duplicado do banco", () => {
    expect(friendlyDbError({ code: "23P01" })).toBe("Esse horário já está ocupado por outro agendamento.");
  });
  it("monta a data no fuso local", () => {
    expect(toLocalDate("2030-01-10", "14:30").getHours()).toBe(14);
  });
});
