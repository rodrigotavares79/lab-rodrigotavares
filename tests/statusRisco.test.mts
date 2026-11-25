// Testes das regras de transição de status do risco (B01).
// Rodar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  statusAutomatico,
  statusPermitidos,
  validarTransicaoStatus,
} from "../lib/statusRisco.ts";

const semPlanos = { total: 0, conformes: 0 };
const umPlanoPendente = { total: 1, conformes: 0 };
const doisPlanosUmConforme = { total: 2, conformes: 1 };
const todosConformes = { total: 2, conformes: 2 };

test("manter o mesmo status é sempre permitido (exceto Mitigado)", () => {
  assert.equal(validarTransicaoStatus("Identificado", "Identificado", semPlanos), null);
  assert.equal(validarTransicaoStatus("Em Tratamento", "Em Tratamento", umPlanoPendente), null);
  // Status vazio no banco conta como Identificado.
  assert.equal(validarTransicaoStatus(null, "Identificado", semPlanos), null);
});

test("Mitigado é terminal", () => {
  for (const novo of ["Identificado", "Em Tratamento", "Mitigado"] as const) {
    assert.match(validarTransicaoStatus("Mitigado", novo, todosConformes) ?? "", /já foi mitigado/);
  }
});

test("Em Tratamento exige pelo menos um plano", () => {
  assert.match(validarTransicaoStatus("Identificado", "Em Tratamento", semPlanos) ?? "", /pelo menos um plano/);
  assert.equal(validarTransicaoStatus("Identificado", "Em Tratamento", umPlanoPendente), null);
});

test("risco com plano não volta para Identificado", () => {
  assert.match(validarTransicaoStatus("Em Tratamento", "Identificado", umPlanoPendente) ?? "", /não pode voltar/);
});

test("Mitigado exige todos os planos Conforme (e pelo menos um)", () => {
  assert.match(validarTransicaoStatus("Identificado", "Mitigado", semPlanos) ?? "", /pelo menos um plano/);
  assert.match(validarTransicaoStatus("Em Tratamento", "Mitigado", umPlanoPendente) ?? "", /\(0 de 1\)/);
  assert.match(validarTransicaoStatus("Em Tratamento", "Mitigado", doisPlanosUmConforme) ?? "", /\(1 de 2\)/);
  assert.equal(validarTransicaoStatus("Em Tratamento", "Mitigado", todosConformes), null);
});

test("statusPermitidos lista só as opções válidas", () => {
  assert.deepEqual(statusPermitidos("Identificado", semPlanos), ["Identificado"]);
  assert.deepEqual(statusPermitidos("Em Tratamento", umPlanoPendente), ["Em Tratamento"]);
  assert.deepEqual(statusPermitidos("Em Tratamento", todosConformes), ["Em Tratamento", "Mitigado"]);
  assert.deepEqual(statusPermitidos("Mitigado", todosConformes), []);
});

test("statusAutomatico: criar plano leva a Em Tratamento; nunca promove para Mitigado", () => {
  assert.equal(statusAutomatico("Identificado", umPlanoPendente), "Em Tratamento");
  assert.equal(statusAutomatico(null, umPlanoPendente), "Em Tratamento");
  assert.equal(statusAutomatico("Em Tratamento", todosConformes), "Em Tratamento");
  assert.equal(statusAutomatico("Em Tratamento", semPlanos), "Identificado");
  assert.equal(statusAutomatico("Mitigado", semPlanos), "Mitigado");
});
