import { test } from "node:test";
import assert from "node:assert/strict";
import { situacaoControles, validarControlesCadastro } from "../lib/controlesRisco.ts";
import { calcularRiscoResidual } from "../lib/metodologiaRisco.ts";

test("situacaoControles", () => {
  assert.equal(situacaoControles({ fatores: 2, sem_controles: false }), "informados");
  assert.equal(situacaoControles({ fatores: 1, sem_controles: true }), "informados");
  assert.equal(situacaoControles({ fatores: 0, sem_controles: true }), "sem_controles");
  assert.equal(situacaoControles({ fatores: 0, sem_controles: null }), "nao_avaliados");
});

test("validarControlesCadastro exige controle ou declaração justificada", () => {
  assert.equal(validarControlesCadastro({ controles: 1, semControles: false }), null);
  assert.match(validarControlesCadastro({ controles: 0, semControles: false })!, /ao menos um controle/);
  assert.match(validarControlesCadastro({ controles: 0, semControles: true, justificativa: "nada" })!, /15/);
  assert.equal(
    validarControlesCadastro({ controles: 0, semControles: true, justificativa: "Sistema novo, ainda sem nenhum controle" }),
    null
  );
  assert.match(validarControlesCadastro({ controles: 2, semControles: true, justificativa: "x".repeat(20) })!, /não os dois/);
});

test("controle validado reduz o nível atual (motor existente)", () => {
  const fator = {
    criticidade: "Alta",
    natureza: "Exposição",
    tipoControle: "Preventivo",
    naturezaControle: "Técnico automatizado",
    eficaciaPotencial: "Alta",
    statusImplementacao: "Não iniciado",
  };
  const antes = calcularRiscoResidual(5, 4, [fator], false);
  const depois = calcularRiscoResidual(5, 4, [{ ...fator, statusImplementacao: "Implementado e validado" }], false);
  assert.equal(antes.nivel, "Crítico");
  assert.ok(depois.probabilidade < antes.probabilidade);
  assert.notEqual(depois.nivel, "Crítico");
});
