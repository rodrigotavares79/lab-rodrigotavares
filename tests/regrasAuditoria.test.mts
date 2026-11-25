// Testes das regras de decisão da auditoria (B08).
// Rodar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { MSG_SEM_EVIDENCIA, validarDecisaoAuditoria } from "../lib/regrasAuditoria.ts";

test("Conforme sem evidência é recusado", () => {
  assert.equal(validarDecisaoAuditoria({ resultado: "Conforme", comentario: null, totalEvidencias: 0 }), MSG_SEM_EVIDENCIA);
});

test("Conforme com evidência passa, comentário opcional", () => {
  assert.equal(validarDecisaoAuditoria({ resultado: "Conforme", comentario: null, totalEvidencias: 1 }), null);
  assert.equal(validarDecisaoAuditoria({ resultado: "Conforme", comentario: "ok", totalEvidencias: 3 }), null);
});

test("Não conforme exige motivo, com ou sem evidência", () => {
  assert.match(validarDecisaoAuditoria({ resultado: "Não conforme", comentario: "  ", totalEvidencias: 0 }) ?? "", /motivo/);
  assert.equal(validarDecisaoAuditoria({ resultado: "Não conforme", comentario: "Falta o relatório do reteste", totalEvidencias: 0 }), null);
});

test("resultado fora da lista", () => {
  assert.equal(validarDecisaoAuditoria({ resultado: "Aprovado", comentario: null, totalEvidencias: 1 }), "Resultado inválido.");
});
