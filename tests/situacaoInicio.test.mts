// Testes do destaque da lista de críticos e altos do Início (B25).
// Rodar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { situacaoInicio } from "../lib/situacaoInicio.ts";

const HOJE = "2026-11-26";

test("sem plano aberto é destacado, exceto risco aceito", () => {
  assert.deepEqual(situacaoInicio({ status: "Identificado", planos_abertos: 0, proximo_prazo: null }, HOJE), { tipo: "sem_plano", texto: "sem plano", alerta: true });
  assert.equal(situacaoInicio({ status: "Aceito", planos_abertos: 0, proximo_prazo: null }, HOJE).tipo, "aceito");
});

test("plano sem ação com prazo é 'sem prazo'", () => {
  assert.equal(situacaoInicio({ status: "Em Tratamento", planos_abertos: 1, proximo_prazo: null }, HOJE).tipo, "sem_prazo");
});

test("prazo vencido e prazo futuro", () => {
  assert.equal(situacaoInicio({ status: "Em Tratamento", planos_abertos: 1, proximo_prazo: "2026-11-20" }, HOJE).tipo, "atrasado");
  assert.deepEqual(situacaoInicio({ status: "Em Tratamento", planos_abertos: 1, proximo_prazo: "2026-12-05T00:00:00.000Z" }, HOJE), {
    tipo: "vence",
    texto: "vence 05/12",
    alerta: false,
  });
  assert.equal(situacaoInicio({ status: "Em Tratamento", planos_abertos: 2, proximo_prazo: HOJE }, HOJE).tipo, "vence");
});
