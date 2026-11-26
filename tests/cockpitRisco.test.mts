import { test } from "node:test";
import assert from "node:assert/strict";
import {
  variacao,
  textoDelta,
  apetitePorCategoria,
  estagioTratamento,
  funilTratamento,
  faixaPrazo,
  acoesPorPrazo,
} from "../lib/cockpitRisco.ts";

test("variacao respeita o sentido de melhora", () => {
  assert.deepEqual(variacao(5, 8, "menor"), { delta: -3, tom: "bom" });
  assert.deepEqual(variacao(8, 5, "menor"), { delta: 3, tom: "ruim" });
  assert.deepEqual(variacao(70, 60, "maior"), { delta: 10, tom: "bom" });
  assert.deepEqual(variacao(40, 38, "neutro"), { delta: 2, tom: "neutro" });
  assert.deepEqual(variacao(4, 4, "menor"), { delta: 0, tom: "neutro" });
  assert.deepEqual(variacao(4, null, "menor"), { delta: null, tom: "neutro" });
});

test("textoDelta usa sinal e sufixo", () => {
  assert.equal(textoDelta(3), "+3");
  assert.equal(textoDelta(-2, " p.p."), "−2 p.p.");
  assert.equal(textoDelta(0), "0");
  assert.equal(textoDelta(null), "");
});

test("apetitePorCategoria separa e ordena pela gravidade", () => {
  const r = apetitePorCategoria([
    { categoria: "Tecnológico", situacao: "dentro" },
    { categoria: "Tecnológico", situacao: "acima_apetite" },
    { categoria: "Financeiro", situacao: "acima_tolerancia" },
    { categoria: null, situacao: "sem_referencia" },
    { categoria: "Tecnológico", situacao: "dentro" },
  ]);
  assert.equal(r[0].categoria, "Financeiro");
  assert.equal(r[0].acimaTolerancia, 1);
  assert.deepEqual(r[1], { categoria: "Tecnológico", dentro: 2, acimaApetite: 1, acimaTolerancia: 0, semLimite: 0, total: 3 });
  assert.equal(r[2].categoria, "Sem categoria");
  assert.equal(r[2].semLimite, 1);
});

test("estagioTratamento", () => {
  assert.equal(estagioTratamento({ status: "Aceito", planos: 0, planosAbertos: 0, planosConformes: 0 }), "aceito");
  assert.equal(estagioTratamento({ status: "Identificado", planos: 0, planosAbertos: 0, planosConformes: 0 }), "sem_plano");
  assert.equal(estagioTratamento({ status: "Em Tratamento", planos: 2, planosAbertos: 1, planosConformes: 1 }), "em_andamento");
  assert.equal(estagioTratamento({ status: "Em Tratamento", planos: 2, planosAbertos: 0, planosConformes: 1 }), "concluido");
  assert.equal(estagioTratamento({ status: "Mitigado", planos: 2, planosAbertos: 0, planosConformes: 2 }), "auditado");
});

test("funilTratamento conta cada estágio", () => {
  const f = funilTratamento([
    { status: "Identificado", planos: 0, planosAbertos: 0, planosConformes: 0 },
    { status: "Em Tratamento", planos: 1, planosAbertos: 1, planosConformes: 0 },
    { status: "Aceito", planos: 0, planosAbertos: 0, planosConformes: 0 },
  ]);
  assert.deepEqual(f, { sem_plano: 1, em_andamento: 1, concluido: 0, auditado: 0, aceito: 1 });
});

test("faixaPrazo: atrasada, vencendo em 30 dias, no prazo, sem prazo", () => {
  const hoje = "2026-11-26";
  assert.equal(faixaPrazo("2026-11-25", hoje), "atrasada");
  assert.equal(faixaPrazo("2026-11-26", hoje), "vencendo");
  assert.equal(faixaPrazo("2026-12-26", hoje), "vencendo");
  assert.equal(faixaPrazo("2026-12-27", hoje), "no_prazo");
  assert.equal(faixaPrazo("2026-12-26T00:00:00.000Z", hoje), "vencendo");
  assert.equal(faixaPrazo(null, hoje), "sem_prazo");
  assert.equal(faixaPrazo("", hoje), "sem_prazo");
});

test("acoesPorPrazo", () => {
  assert.deepEqual(acoesPorPrazo(["2026-01-01", null, "2027-06-01", "2026-12-01"], "2026-11-26"), {
    atrasada: 1,
    vencendo: 1,
    no_prazo: 1,
    sem_prazo: 1,
  });
});
