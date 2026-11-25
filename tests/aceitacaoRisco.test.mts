// Testes da aceitação formal de risco (B16) e do status Aceito.
// Rodar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularValidoAte, validarDecisao, validarSolicitacao } from "../lib/aceitacaoRisco.ts";
import { podeAprovarAceitacao, rotuloAlcada } from "../lib/perfisRiscos.ts";
import { statusAutomatico, statusPermitidos, validarTransicaoStatus } from "../lib/statusRisco.ts";

test("alçada: Crítico só CISO; Alto Gerente ou CISO; Baixo/Médio a partir de Coordenador", () => {
  assert.equal(podeAprovarAceitacao("ciso", "Crítico"), true);
  assert.equal(podeAprovarAceitacao("gerente", "Crítico"), false);
  assert.equal(podeAprovarAceitacao("administrador", "Crítico"), false);
  assert.equal(podeAprovarAceitacao("gerente", "Alto"), true);
  assert.equal(podeAprovarAceitacao("coordenador", "Alto"), false);
  assert.equal(podeAprovarAceitacao("coordenador", "Médio"), true);
  assert.equal(podeAprovarAceitacao("analista_grc", "Baixo"), false);
  assert.equal(rotuloAlcada("Crítico"), "CISO");
});

const base = {
  decisao: "Aprovar", motivo: null, situacao: "Pendente",
  aprovadorEmail: "ciso@exemplo.com", solicitanteEmail: "analista@exemplo.com",
  temAlcada: true, alcadaTexto: "CISO", nivelRisco: "Crítico",
};

test("decisão: quem pediu não decide", () => {
  assert.match(validarDecisao({ ...base, aprovadorEmail: "Analista@Exemplo.com" }) ?? "", /segregação/);
});

test("decisão: sem alçada é recusada com a alçada exigida", () => {
  assert.match(validarDecisao({ ...base, temAlcada: false }) ?? "", /exige alçada de: CISO/);
});

test("decisão: recusar exige motivo; aprovar não", () => {
  assert.equal(validarDecisao(base), null);
  assert.match(validarDecisao({ ...base, decisao: "Recusar" }) ?? "", /motivo/);
  assert.equal(validarDecisao({ ...base, decisao: "Recusar", motivo: "Sem plano de contingência" }), null);
});

test("decisão: só aceitação pendente", () => {
  assert.match(validarDecisao({ ...base, situacao: "Aprovada" }) ?? "", /não está aguardando/);
});

test("solicitação: justificativa, validade e uma ativa por risco", () => {
  const ok = { statusRisco: "Identificado", justificativa: "Custo do controle supera a perda esperada.", validadeMeses: 12, temAtiva: false };
  assert.equal(validarSolicitacao(ok), null);
  assert.match(validarSolicitacao({ ...ok, justificativa: "curta" }) ?? "", /justificativa/);
  assert.match(validarSolicitacao({ ...ok, validadeMeses: 36 }) ?? "", /1 a 24/);
  assert.match(validarSolicitacao({ ...ok, temAtiva: true }) ?? "", /já tem/);
  assert.match(validarSolicitacao({ ...ok, statusRisco: "Mitigado" }) ?? "", /mitigado/);
});

test("validade: soma meses e respeita o fim do mês", () => {
  assert.equal(calcularValidoAte("2026-11-25", 12), "2027-11-25");
  assert.equal(calcularValidoAte("2027-01-31", 1), "2027-02-28");
});

test("status Aceito: não se chega pela reavaliação; sair segue as regras", () => {
  const umPlano = { total: 1, conformes: 0 };
  const semPlano = { total: 0, conformes: 0 };
  assert.match(validarTransicaoStatus("Identificado", "Aceito", semPlano) ?? "", /solicite a aceitação/);
  assert.equal(validarTransicaoStatus("Aceito", "Aceito", semPlano), null);
  assert.equal(validarTransicaoStatus("Aceito", "Identificado", semPlano), null);
  assert.equal(validarTransicaoStatus("Aceito", "Em Tratamento", umPlano), null);
  assert.ok(!statusPermitidos("Identificado", semPlano).includes("Aceito"));
  assert.equal(statusAutomatico("Aceito", umPlano), "Aceito");
});
