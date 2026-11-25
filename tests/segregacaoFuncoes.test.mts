// Testes da segregação de funções na auditoria (B07).
// Rodar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { motivoConflitoAuditoria } from "../lib/segregacaoFuncoes.ts";

const auditor = "tiago.dias@exemplo.com";

test("auditor sem vínculo com o plano pode auditar", () => {
  assert.equal(
    motivoConflitoAuditoria({
      auditorEmail: auditor,
      criadoPorEmail: "pedro@exemplo.com",
      acoes: [{ responsavel_email: "marcelo@exemplo.com" }, { responsavel_email: "pedro@exemplo.com" }],
    }),
    null
  );
});

test("quem criou o plano não audita (sem diferenciar maiúsculas)", () => {
  assert.match(
    motivoConflitoAuditoria({ auditorEmail: auditor, criadoPorEmail: "Tiago.Dias@Exemplo.com", acoes: [] }) ?? "",
    /criou este plano/
  );
});

test("responsável por qualquer ação não audita", () => {
  assert.match(
    motivoConflitoAuditoria({
      auditorEmail: auditor,
      criadoPorEmail: null,
      acoes: [{ responsavel_email: "pedro@exemplo.com" }, { responsavel_email: auditor }],
    }) ?? "",
    /responsável por uma ou mais ações/
  );
});

test("ação sem responsável vinculado impede a auditoria", () => {
  const motivo = motivoConflitoAuditoria({
    auditorEmail: auditor,
    criadoPorEmail: null,
    acoes: [{ responsavel_email: null, responsavel: "Tavares" }, { responsavel_email: null }],
  });
  assert.match(motivo ?? "", /^2 ações deste plano não têm responsável vinculado/);
});

test("plano antigo sem criador registrado: vale só a regra das ações", () => {
  assert.equal(
    motivoConflitoAuditoria({ auditorEmail: auditor, criadoPorEmail: null, acoes: [{ responsavel_email: "pedro@exemplo.com" }] }),
    null
  );
});
