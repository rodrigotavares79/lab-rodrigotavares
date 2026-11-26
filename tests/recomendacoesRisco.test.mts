// Testes das recomendações priorizadas do Relatório Executivo (B26).
// Rodar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { recomendacoes, type FatosPortfolio } from "../lib/recomendacoesRisco.ts";

const LIMPO: FatosPortfolio = {
  acimaTolerancia: [],
  acimaApetite: 0,
  krisVermelho: [],
  krisSemMedicao: 0,
  semTratamento: [],
  acoesAtrasadas: { total: 0, riscos: [] },
  revisoesVencidas: 0,
  planosAguardandoAuditoria: 0,
  aceitacoesPendentes: 0,
  aceitacoesVencendo: [],
  apetitePendente: null,
  semDono: 0,
  controlesNaoAvaliados: 0,
  altoCriticoAgora: 10,
  altoCriticoTresMesesAntes: 12,
};

test("portfólio em dia não gera recomendação", () => {
  assert.deepEqual(recomendacoes(LIMPO), []);
});

test("acima da tolerância: sem plano é 'agir já' antes de acelerar quem já tem plano; aceito fica de fora", () => {
  const r = recomendacoes({
    ...LIMPO,
    acimaTolerancia: [
      { id: 58, nivel: "Crítico", temPlanoAberto: false, aceito: false },
      { id: 34, nivel: "Crítico", temPlanoAberto: true, aceito: false },
      { id: 9, nivel: "Alto", temPlanoAberto: false, aceito: true },
    ],
  });
  assert.equal(r.length, 2);
  assert.match(r[0].titulo, /Definir tratamento para 1 risco acima da tolerância/);
  assert.deepEqual(r[0].riscos, [58]);
  assert.match(r[1].titulo, /Acelerar os planos de 1 risco/);
  assert.deepEqual(r[1].riscos, [34]);
  assert.ok(r.every((x) => x.prioridade === 1));
});

test("KRI no vermelho agrupa por risco e cita os códigos", () => {
  const [r] = recomendacoes({ ...LIMPO, krisVermelho: [{ codigo: "KRI-001", riscoId: 34 }, { codigo: "KRI-009", riscoId: 34 }] });
  assert.equal(r.titulo, "Reavaliar 1 risco com indicador no vermelho");
  assert.match(r.porque, /KRI-001, KRI-009/);
  assert.deepEqual(r.riscos, [34]);
});

test("ações atrasadas: 5 ou mais sobem para 'agir já'", () => {
  assert.equal(recomendacoes({ ...LIMPO, acoesAtrasadas: { total: 3, riscos: [8, 8, 13] } })[0].prioridade, 2);
  const r = recomendacoes({ ...LIMPO, acoesAtrasadas: { total: 7, riscos: [13, 8] } })[0];
  assert.equal(r.prioridade, 1);
  assert.deepEqual(r.riscos, [8, 13]);
});

test("alta de Alto/Crítico em três meses vira investigação; queda não", () => {
  assert.equal(recomendacoes({ ...LIMPO, altoCriticoAgora: 15, altoCriticoTresMesesAntes: 12 })[0].titulo, "Investigar a alta de riscos Altos e Críticos");
  assert.equal(recomendacoes({ ...LIMPO, altoCriticoAgora: null }).length, 0);
});

test("ordena por prioridade e respeita o limite", () => {
  const r = recomendacoes(
    {
      ...LIMPO,
      semDono: 1,
      revisoesVencidas: 4,
      semTratamento: [5],
      apetitePendente: 3,
      acimaApetite: 2,
      planosAguardandoAuditoria: 1,
      aceitacoesPendentes: 1,
      aceitacoesVencendo: [9],
      krisSemMedicao: 1,
    },
    5
  );
  assert.equal(r.length, 5);
  assert.deepEqual(r.map((x) => x.prioridade), [1, 2, 2, 2, 2]);
  assert.match(r[0].titulo, /Altos ou Críticos|Alto ou Crítico/);
  assert.match(r[2].titulo, /versão 3 do apetite/);
});
