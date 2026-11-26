import { test } from "node:test";
import assert from "node:assert/strict";
import { CATEGORIAS_RISCO, NOMES_CATEGORIAS, ETAPAS_PROCESSO, EXEMPLO_EXPOSICAO as X } from "../lib/politicaRiscos.ts";
import { calcularExposicao, mediaPert, perdaPorIndisponibilidade } from "../lib/exposicaoRisco.ts";

test("seis etapas, com nomes únicos", () => {
  assert.equal(ETAPAS_PROCESSO.length, 6);
  assert.equal(new Set(ETAPAS_PROCESSO.map((e) => e.nome)).size, 6);
});

test("as sete categorias usadas no sistema, cada uma com definição e pergunta", () => {
  assert.deepEqual([...NOMES_CATEGORIAS].sort(), [
    "Conformidade / Regulatório",
    "Estratégico",
    "Financeiro",
    "Operacional",
    "Reputacional",
    "Segurança da Informação",
    "Tecnológico",
  ]);
  for (const c of CATEGORIAS_RISCO) {
    assert.ok(c.definicao.length > 30 && c.pergunta.endsWith("?") && c.exemplos.length > 10, c.nome);
  }
});

test("o exemplo da documentação bate com o motor de cálculo", () => {
  const perda = perdaPorIndisponibilidade(X.custoHora, X.horasParada)!;
  assert.deepEqual(perda, X.esperado.perdaEvento);
  assert.equal(Math.round(mediaPert(X.frequencia) * 10000) / 10000, X.esperado.pertFrequencia);
  assert.equal(mediaPert(perda), X.esperado.pertPerda);
  const e = calcularExposicao(X.frequencia, perda);
  assert.equal(e.ale, X.esperado.ale);
  assert.equal(e.min, X.esperado.aleMin);
  assert.equal(e.max, X.esperado.aleMax);
  const depois = calcularExposicao(X.plano.frequenciaDepois, perdaPorIndisponibilidade(X.custoHora, X.plano.horasDepois)!);
  assert.equal(depois.ale, X.plano.aleDepoisEsperada);
});
