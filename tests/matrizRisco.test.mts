// Testes da matriz de riscos 5×5 contra as faixas da política (B04).
// Política (POL-RISK-001, item 5): pontuação = Probabilidade × Impacto,
// Baixo 1–4 · Médio 5–9 · Alto 10–16 · Crítico 20–25.
// Rodar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FAIXAS_NIVEL_RISCO,
  MATRIZ_5X5,
  NIVEL_RISCO_LABEL,
  nivelPorPontuacao,
  nivelRisco,
} from "../lib/metodologiaRisco.ts";

const POLITICA: Array<[string, number, number]> = [
  ["Baixo", 1, 4],
  ["Médio", 5, 9],
  ["Alto", 10, 16],
  ["Crítico", 20, 25],
];

function nivelEsperado(pontuacao: number): string {
  const faixa = POLITICA.find(([, min, max]) => pontuacao >= min && pontuacao <= max);
  assert.ok(faixa, `pontuação ${pontuacao} fora de qualquer faixa da política`);
  return faixa[0];
}

test("as faixas do código são as da política", () => {
  assert.deepEqual(
    FAIXAS_NIVEL_RISCO.map((f) => [f.rotulo, f.min, f.max]),
    POLITICA
  );
});

test("cada uma das 25 células da matriz tem o nível da política", () => {
  for (let p = 1; p <= 5; p++) {
    for (let i = 1; i <= 5; i++) {
      const rotulo = NIVEL_RISCO_LABEL[MATRIZ_5X5[p - 1][i - 1]];
      assert.equal(rotulo, nivelEsperado(p * i), `P${p} × I${i} = ${p * i}`);
      assert.equal(nivelRisco(p, i), rotulo, `nivelRisco(${p}, ${i})`);
    }
  }
});

test("casos de fronteira", () => {
  assert.equal(NIVEL_RISCO_LABEL[nivelPorPontuacao(4)], "Baixo");
  assert.equal(NIVEL_RISCO_LABEL[nivelPorPontuacao(5)], "Médio");
  assert.equal(NIVEL_RISCO_LABEL[nivelPorPontuacao(9)], "Médio");
  assert.equal(NIVEL_RISCO_LABEL[nivelPorPontuacao(10)], "Alto");
  assert.equal(NIVEL_RISCO_LABEL[nivelPorPontuacao(16)], "Alto");
  assert.equal(NIVEL_RISCO_LABEL[nivelPorPontuacao(20)], "Crítico");
  assert.equal(NIVEL_RISCO_LABEL[nivelPorPontuacao(25)], "Crítico");
});

test("contagem por nível: 8 Baixo, 7 Médio, 7 Alto, 3 Crítico", () => {
  const contagem: Record<string, number> = {};
  for (const linha of MATRIZ_5X5) {
    for (const n of linha) contagem[NIVEL_RISCO_LABEL[n]] = (contagem[NIVEL_RISCO_LABEL[n]] || 0) + 1;
  }
  assert.deepEqual(contagem, { Baixo: 8, Médio: 7, Alto: 7, Crítico: 3 });
});
