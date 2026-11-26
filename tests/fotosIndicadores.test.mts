import { test } from "node:test";
import assert from "node:assert/strict";
import {
  referenciaDaFoto,
  mesesAte,
  rotuloMes,
  serie,
  contagemPorNivel,
  altosOuCriticos,
  conformidadeTratamento,
} from "../lib/fotosIndicadores.ts";

test("referenciaDaFoto: dia 1 fecha o mês anterior; demais dias, mês corrente", () => {
  assert.equal(referenciaDaFoto("2026-11-26"), "2026-11-01");
  assert.equal(referenciaDaFoto("2026-12-01"), "2026-11-01");
  assert.equal(referenciaDaFoto("2027-01-01"), "2026-12-01");
  assert.equal(referenciaDaFoto("2027-01-02"), "2027-01-01");
});

test("mesesAte cruza a virada do ano", () => {
  assert.deepEqual(mesesAte("2027-02-01", 4), ["2026-11-01", "2026-12-01", "2027-01-01", "2027-02-01"]);
  assert.equal(mesesAte("2026-11-01", 12).length, 12);
  assert.equal(mesesAte("2026-11-01", 12)[0], "2025-12-01");
});

test("rotuloMes", () => {
  assert.equal(rotuloMes("2026-11-01"), "nov/26");
  assert.equal(rotuloMes("2027-01-01"), "jan/27");
});

test("serie deixa lacuna no mês sem foto", () => {
  const fotos = [
    { referencia: "2026-10-01", dados: { ativos: 50 } as any },
    { referencia: "2026-12-01T00:00:00.000Z", dados: { ativos: 40 } as any },
  ];
  assert.deepEqual(serie(["2026-10-01", "2026-11-01", "2026-12-01"], fotos, (f) => f.ativos), [50, null, 40]);
});

test("contagemPorNivel, altosOuCriticos e conformidade", () => {
  const c = contagemPorNivel([
    { nivel: "Crítico", total: 3 },
    { nivel: "Alto", total: 2 },
    { nivel: null, total: 9 },
    { nivel: "Baixo", total: 1 },
  ]);
  assert.deepEqual(c, { Crítico: 3, Alto: 2, Médio: 0, Baixo: 1 });
  assert.equal(altosOuCriticos(c), 5);
  assert.equal(conformidadeTratamento({ altoCriticoTotal: 8, altoCriticoComTratamento: 2 } as any), 25);
  assert.equal(conformidadeTratamento({ altoCriticoTotal: 0, altoCriticoComTratamento: 0 } as any), null);
});
