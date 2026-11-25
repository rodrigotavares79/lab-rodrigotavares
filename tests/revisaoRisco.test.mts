// Testes da situação da revisão periódica (B17).
// Rodar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { hojeSaoPaulo, situacaoRevisao, textoSituacaoRevisao } from "../lib/revisaoRisco.ts";

test("revisão vencida conta os dias de atraso", () => {
  assert.deepEqual(situacaoRevisao("2026-10-20", "2026-11-25"), { estado: "vencida", dias: 36 });
  assert.equal(textoSituacaoRevisao({ estado: "vencida", dias: 1 }), "vencida há 1 dia");
});

test("vence hoje e nos próximos 15 dias é aviso, não atraso", () => {
  assert.deepEqual(situacaoRevisao("2026-11-25", "2026-11-25"), { estado: "vence_em_breve", dias: 0 });
  assert.equal(textoSituacaoRevisao(situacaoRevisao("2026-11-25", "2026-11-25")), "vence hoje");
  assert.deepEqual(situacaoRevisao("2026-12-10", "2026-11-25"), { estado: "vence_em_breve", dias: 15 });
  assert.deepEqual(situacaoRevisao("2026-12-11", "2026-11-25"), { estado: "em_dia", dias: 16 });
});

test("sem data de próxima revisão", () => {
  assert.deepEqual(situacaoRevisao(null, "2026-11-25"), { estado: "sem_prazo" });
});

test("aceita timestamp completo e atravessa mudança de ano", () => {
  assert.deepEqual(situacaoRevisao("2027-01-05T00:00:00.000Z", "2026-12-31"), { estado: "vence_em_breve", dias: 5 });
});

test("hoje no fuso de São Paulo (21h em SP já é dia seguinte em UTC)", () => {
  assert.equal(hojeSaoPaulo(new Date("2026-11-26T00:30:00Z")), "2026-11-25");
});
