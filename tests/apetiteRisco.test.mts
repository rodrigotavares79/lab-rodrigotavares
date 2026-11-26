// Testes do apetite e da tolerância a risco por categoria (B18).
// Rodar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  diferencas,
  situacaoApetite,
  situacaoDoRisco,
  validarDecisaoApetite,
  validarLimite,
  validarProposta,
} from "../lib/apetiteRisco.ts";
import { podeAprovarApetite } from "../lib/perfisRiscos.ts";

const LIM = { apetite: "Médio", tolerancia: "Alto" };

test("situação pelo nível atual frente ao apetite e à tolerância", () => {
  assert.equal(situacaoApetite("Baixo", LIM), "dentro");
  assert.equal(situacaoApetite("Médio", LIM), "dentro");
  assert.equal(situacaoApetite("Alto", LIM), "acima_apetite");
  assert.equal(situacaoApetite("Crítico", LIM), "acima_tolerancia");
  assert.equal(situacaoApetite("Alto", null), "sem_referencia");
  assert.equal(situacaoApetite(null, LIM), "sem_referencia");
  assert.equal(situacaoApetite("Crítico", { apetite: "Alto", tolerancia: "Crítico" }), "acima_apetite");
});

test("risco mitigado ou sem categoria com limite fica sem referência", () => {
  const mapa = new Map([["Tecnológico", LIM]]);
  assert.equal(situacaoDoRisco({ status: "Mitigado", impacto_qualitativo: "Crítico", categoria: "Tecnológico" }, mapa), "sem_referencia");
  assert.equal(situacaoDoRisco({ status: "Em Tratamento", impacto_qualitativo: "Crítico", categoria: "Financeiro" }, mapa), "sem_referencia");
  assert.equal(situacaoDoRisco({ status: "Aceito", impacto_qualitativo: "Crítico", categoria: "Tecnológico" }, mapa), "acima_tolerancia");
});

test("tolerância nunca menor que o apetite; níveis só da escala", () => {
  assert.equal(validarLimite({ categoria: "TI", apetite: "Médio", tolerancia: "Médio" }), null);
  assert.match(validarLimite({ categoria: "TI", apetite: "Alto", tolerancia: "Médio" })!, /não pode ser menor/);
  assert.match(validarLimite({ categoria: "TI", apetite: "Muito alto", tolerancia: "Alto" })!, /Apetite inválido/);
  assert.match(validarLimite({ categoria: " ", apetite: "Baixo", tolerancia: "Alto" })!, /categoria/);
});

test("proposta exige motivo, ao menos uma categoria e sem repetição", () => {
  const ok = { justificativa: "Revisão anual aprovada no comitê de riscos.", limites: [{ categoria: "TI", ...LIM }] };
  assert.equal(validarProposta(ok), null);
  assert.match(validarProposta({ ...ok, justificativa: "curta" })!, /20 caracteres/);
  assert.match(validarProposta({ ...ok, limites: [] })!, /ao menos uma/);
  assert.match(validarProposta({ ...ok, limites: [{ categoria: "TI", ...LIM }, { categoria: "ti ", ...LIM }] })!, /mais de uma vez/);
});

test("só CISO e Administrador decidem; quem propôs não decide", () => {
  assert.equal(podeAprovarApetite("ciso"), true);
  assert.equal(podeAprovarApetite("administrador"), true);
  for (const p of ["gerente", "coordenador", "analista_grc", "auditor", "usuario"] as const) assert.equal(podeAprovarApetite(p), false);
  const base = { decisao: "Aprovar", situacao: "Pendente", aprovadorEmail: "ciso@x.com", propostoPorEmail: "analista@x.com", temAlcada: true };
  assert.equal(validarDecisaoApetite(base), null);
  assert.match(validarDecisaoApetite({ ...base, temAlcada: false })!, /CISO/);
  assert.match(validarDecisaoApetite({ ...base, propostoPorEmail: "CISO@x.com" })!, /segregação/);
  assert.match(validarDecisaoApetite({ ...base, situacao: "Vigente" })!, /não está aguardando/);
  assert.match(validarDecisaoApetite({ ...base, decisao: "Recusar" })!, /motivo/);
  assert.equal(validarDecisaoApetite({ ...base, decisao: "Recusar", motivo: "Muito permissivo." }), null);
});

test("diferenças entre a versão vigente e a proposta", () => {
  const vig = [{ categoria: "A", apetite: "Médio", tolerancia: "Alto" }, { categoria: "B", apetite: "Baixo", tolerancia: "Médio" }];
  const prop = [{ categoria: "A", apetite: "Baixo", tolerancia: "Alto" }, { categoria: "C", apetite: "Médio", tolerancia: "Alto" }];
  assert.deepEqual(diferencas(vig, prop), [
    { categoria: "A", antes: "Médio / Alto", depois: "Baixo / Alto" },
    { categoria: "C", antes: null, depois: "Médio / Alto" },
    { categoria: "B", antes: "Baixo / Médio", depois: null },
  ]);
  assert.deepEqual(diferencas(vig, vig), []);
});
