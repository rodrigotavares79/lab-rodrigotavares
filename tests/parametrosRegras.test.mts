// Testes dos parâmetros da política editáveis pela tela (B29).
// Rodar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { validarParametros } from "../lib/parametrosRegras.ts";

const OK = { prazoTratamentoDias: "15", revisao: { Crítico: 30, Alto: 90, Médio: 180, Baixo: 365 } };

test("aceita os valores atuais da política e converte texto em número", () => {
  assert.deepEqual(validarParametros(OK), { prazoTratamentoDias: 15, revisao: { Crítico: 30, Alto: 90, Médio: 180, Baixo: 365 } });
});

test("recusa valores fora da faixa ou não inteiros", () => {
  assert.match(validarParametros({ ...OK, prazoTratamentoDias: 0 }) as string, /1 a 365/);
  assert.match(validarParametros({ ...OK, prazoTratamentoDias: "7.5" }) as string, /inteiro/);
  assert.match(validarParametros({ ...OK, revisao: { ...OK.revisao, Baixo: 1000 } }) as string, /Baixo/);
  assert.match(validarParametros({ ...OK, revisao: { ...OK.revisao, Médio: "" } }) as string, /Médio/);
});

test("nível mais grave não pode ser revisado com menos frequência que um mais leve", () => {
  assert.match(validarParametros({ ...OK, revisao: { ...OK.revisao, Crítico: 120 } }) as string, /Crítico precisa ser revisado/);
  assert.equal(typeof validarParametros({ ...OK, revisao: { Crítico: 90, Alto: 90, Médio: 90, Baixo: 90 } }), "object");
});
