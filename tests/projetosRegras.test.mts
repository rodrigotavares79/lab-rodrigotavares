// Testes do cadastro de projetos e das solicitações de inclusão (B29).
// Rodar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { chaveNomeProjeto, normalizarNomeProjeto, projetoComMesmoNome, validarDecisao, validarNomeProjeto, validarSolicitacao } from "../lib/projetosRegras.ts";

const EXISTENTES = [{ id: 1, nome: "Stark Industries" }, { id: 2, nome: "Corporativo (transversal)" }];

test("nome: normaliza espaços e valida tamanho", () => {
  assert.equal(normalizarNomeProjeto("  Nova   Unidade  "), "Nova Unidade");
  assert.match(validarNomeProjeto("ab") ?? "", /3 caracteres/);
  assert.match(validarNomeProjeto("x".repeat(121)) ?? "", /120/);
  assert.equal(validarNomeProjeto("SESI Contagem"), null);
});

test("duplicado ignora maiúsculas, acentos e espaços, e o próprio projeto na edição", () => {
  assert.equal(chaveNomeProjeto(" Gestão  Acadêmica "), "gestao academica");
  assert.equal(projetoComMesmoNome("stark   industries", EXISTENTES)?.id, 1);
  assert.equal(projetoComMesmoNome("Stark Industries", EXISTENTES, 1), undefined);
  assert.equal(projetoComMesmoNome("Wayne Enterprises", EXISTENTES), undefined);
});

test("solicitação exige nome e justificativa", () => {
  assert.equal(validarSolicitacao({ nome: "Wayne Enterprises", justificativa: "Novo cliente do contrato de 2027" }), null);
  assert.match(validarSolicitacao({ nome: "Wayne Enterprises", justificativa: "novo" }) ?? "", /10 caracteres/);
});

test("decisão: segregação, motivo na recusa e aprovação por nome ou projeto existente", () => {
  const ctx = { situacao: "Pendente", solicitante: "pedro@ex.com", decisor: "rodrigo@ex.com" };
  assert.equal(validarDecisao({ decisao: "Aprovada", nome: "Wayne Enterprises" }, ctx), null);
  assert.equal(validarDecisao({ decisao: "Aprovada", projetoExistenteId: 2 }, ctx), null);
  assert.match(validarDecisao({ decisao: "Recusada", motivo: "" }, ctx) ?? "", /motivo/);
  assert.equal(validarDecisao({ decisao: "Recusada", motivo: "Já existe como Stark" }, ctx), null);
  assert.match(validarDecisao({ decisao: "Aprovada", nome: "X" }, { ...ctx, decisor: "PEDRO@ex.com" }) ?? "", /própria/);
  assert.match(validarDecisao({ decisao: "Aprovada", nome: "Wayne" }, { ...ctx, situacao: "Aprovada" }) ?? "", /já foi decidida/);
  assert.equal(validarDecisao({ decisao: "Talvez" }, ctx), "Decisão inválida.");
});
