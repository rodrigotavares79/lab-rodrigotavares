import { test } from "node:test";
import assert from "node:assert/strict";
import { resumirCenario, proximoCodigoCenario } from "../lib/resumoCenario.ts";

test("resumirCenario conta projetos, níveis e tratamento", () => {
  const r = resumirCenario([
    { projeto_id: 1, nivel: "Crítico", status: "Identificado", planos: 0, aceito: false },
    { projeto_id: 1, nivel: "Crítico", status: "Em Tratamento", planos: 2, aceito: false },
    { projeto_id: 2, nivel: "Médio", status: "Aceito", planos: 0, aceito: true },
    { projeto_id: 3, nivel: "Alto", status: "Mitigado", planos: 1, aceito: false },
    { projeto_id: 9, nivel: "Alto", status: "Identificado", planos: 0, aceito: false, corporativo: true },
  ]);
  assert.equal(r.projetos, 3);
  assert.equal(r.riscos, 4);
  assert.deepEqual(r.porNivel, { Crítico: 2, Alto: 1, Médio: 1, Baixo: 0 });
  assert.equal(r.altosOuCriticos, 3);
  assert.equal(r.comPlano, 1);
  assert.equal(r.aceitos, 1);
  assert.equal(r.mitigados, 1);
  assert.equal(r.semTratamento, 1);
  assert.equal(r.outrosSemPlano, 0);
  assert.equal(r.candidatoCorporativo, true);
});

test("resumirCenario com um projeto não é candidato a corporativo", () => {
  const r = resumirCenario([{ projeto_id: 1, nivel: null, status: null, planos: 0, aceito: false }]);
  assert.equal(r.candidatoCorporativo, false);
  assert.equal(r.semTratamento, 0);
  assert.equal(r.outrosSemPlano, 1);
});

test("proximoCodigoCenario", () => {
  assert.equal(proximoCodigoCenario([]), "CEN-001");
  assert.equal(proximoCodigoCenario(["CEN-004", "CEN-002", "outro"]), "CEN-005");
  assert.equal(proximoCodigoCenario(["CEN-099"]), "CEN-100");
});

test("resumirCenario: Baixo/Médio sem plano não conta como sem tratamento (B02)", () => {
  const r = resumirCenario([
    { projeto_id: 1, nivel: "Baixo", status: "Identificado", planos: 0, aceito: false },
    { projeto_id: 2, nivel: "Médio", status: "Identificado", planos: 0, aceito: false },
    { projeto_id: 3, nivel: "Alto", status: "Identificado", planos: 0, aceito: false },
  ]);
  assert.equal(r.semTratamento, 1);
  assert.equal(r.outrosSemPlano, 2);
});
