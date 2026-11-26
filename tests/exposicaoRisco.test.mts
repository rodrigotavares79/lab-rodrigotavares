// Testes da estimativa quantitativa de exposição (B23).
// Rodar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularExposicao, lerFaixa, mediaPert, perdaPorIndisponibilidade, textoFrequencia } from "../lib/exposicaoRisco.ts";
import { recomendacoes } from "../lib/recomendacoesRisco.ts";

test("faixa: mínimo ≤ provável ≤ máximo, sem negativos, aceita formato brasileiro", () => {
  assert.deepEqual(lerFaixa({ min: "0,5", provavel: "1", max: "3" }, "frequência anual"), { min: 0.5, provavel: 1, max: 3 });
  assert.deepEqual(lerFaixa({ min: "R$ 10.000", provavel: "50.000,00", max: 200000 }, "perda por evento"), { min: 10000, provavel: 50000, max: 200000 });
  assert.match(lerFaixa({ min: 2, provavel: 1, max: 3 }, "frequência anual") as string, /mínimo ≤ provável ≤ máximo/);
  assert.match(lerFaixa({ min: -1, provavel: 1, max: 3 }, "perda por evento") as string, /negativa/);
  assert.match(lerFaixa({ min: 0, provavel: 0, max: 0 }, "perda por evento") as string, /maior que zero/);
  assert.match(lerFaixa({ min: 1, provavel: 2 }, "frequência anual") as string, /Informe/);
  assert.match(lerFaixa({ min: 1, provavel: 2, max: 500 }, "frequência anual", 365) as string, /limite/);
});

test("perda anual esperada: média PERT das duas faixas; faixa de mín×mín a máx×máx", () => {
  assert.equal(mediaPert({ min: 0, provavel: 1, max: 2 }), 1);
  const e = calcularExposicao({ min: 0.5, provavel: 1, max: 3 }, { min: 10000, provavel: 40000, max: 160000 });
  // freq PERT = (0,5 + 4 + 3)/6 = 1,25 ; perda PERT = (10k + 160k + 160k)/6 = 55k
  assert.equal(e.ale, 68750);
  assert.equal(e.min, 5000);
  assert.equal(e.max, 480000);
});

test("perda pela indisponibilidade: custo por hora do ativo × horas paradas", () => {
  assert.deepEqual(perdaPorIndisponibilidade("40000.00", { min: 2, provavel: 6, max: 24 }), { min: 80000, provavel: 240000, max: 960000 });
  assert.equal(perdaPorIndisponibilidade("0.00", { min: 1, provavel: 2, max: 3 }), null);
  assert.equal(perdaPorIndisponibilidade(null, { min: 1, provavel: 2, max: 3 }), null);
});

test("texto da frequência", () => {
  assert.equal(textoFrequencia(0.25), "1 vez a cada 4 anos");
  assert.equal(textoFrequencia(1), "1 vez por ano");
  assert.equal(textoFrequencia(2.5), "2,5 vezes por ano");
});

test("recomendação para a maior exposição financeira sem plano", () => {
  const base = {
    acimaTolerancia: [], acimaApetite: 0, krisVermelho: [], krisSemMedicao: 0, semTratamento: [],
    acoesAtrasadas: { total: 0, riscos: [] }, revisoesVencidas: 0, planosAguardandoAuditoria: 0, aceitacoesPendentes: 0,
    aceitacoesVencendo: [], apetitePendente: null, semDono: 0, controlesNaoAvaliados: 0, altoCriticoAgora: null, altoCriticoTresMesesAntes: null,
  };
  const [r] = recomendacoes({ ...base, maiorExposicaoSemPlano: { id: 41, ale: 360000 } });
  assert.equal(r.prioridade, 2);
  assert.deepEqual(r.riscos, [41]);
  assert.match(r.porque, /360\.000/);
  assert.equal(recomendacoes({ ...base, maiorExposicaoSemPlano: null }).length, 0);
});
