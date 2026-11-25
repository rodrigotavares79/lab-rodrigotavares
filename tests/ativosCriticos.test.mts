import { test } from "node:test";
import assert from "node:assert/strict";
import { validarAtivo, custoOuNull, ativoTemCusto, podeTrocarAtivo, tipoAtivoValido } from "../lib/ativosCriticos.ts";

test("custoOuNull aceita número, formato brasileiro e vazio", () => {
  assert.equal(custoOuNull(""), null);
  assert.equal(custoOuNull(null), null);
  assert.equal(custoOuNull(1500), 1500);
  assert.equal(custoOuNull("1.234,56"), 1234.56);
  assert.equal(custoOuNull("250.5"), 250.5);
  assert.equal(custoOuNull("-3"), "invalido");
  assert.equal(custoOuNull("abc"), "invalido");
});

test("validarAtivo exige nome, tipo e área", () => {
  assert.match((validarAtivo({ nome: "x", tipo: "Sistema", areaResponsavel: "TI" }) as any).erro, /nome/);
  assert.match((validarAtivo({ nome: "ERP", tipo: "Planilha", areaResponsavel: "TI" }) as any).erro, /Tipo/);
  assert.match((validarAtivo({ nome: "ERP", tipo: "Sistema", areaResponsavel: " " }) as any).erro, /área/);
});

test("validarAtivo exige os dois custos ou nenhum", () => {
  assert.match(
    (validarAtivo({ nome: "ERP", tipo: "Sistema", areaResponsavel: "TI", custoIndisponibilidadeHora: "100" }) as any).erro,
    /dois custos/
  );
  const ok = validarAtivo({ nome: " Folha  de pagamento ", tipo: "Processo", areaResponsavel: "RH" }) as any;
  assert.deepEqual(ok.ativo, {
    nome: "Folha de pagamento",
    tipo: "Processo",
    areaResponsavel: "RH",
    descricao: null,
    custoIndisponibilidadeHora: null,
    custoRestauracaoHoraHomem: null,
  });
  const comCusto = validarAtivo({
    nome: "ERP",
    tipo: "Sistema",
    areaResponsavel: "TI",
    custoIndisponibilidadeHora: "1.000,00",
    custoRestauracaoHoraHomem: 80,
  }) as any;
  assert.equal(comCusto.ativo.custoIndisponibilidadeHora, 1000);
});

test("ativoTemCusto e tipoAtivoValido", () => {
  assert.equal(ativoTemCusto({ custo_indisponibilidade_hora: "100", custo_restauracao_hora_homem: "0" }), true);
  assert.equal(ativoTemCusto({ custo_indisponibilidade_hora: null, custo_restauracao_hora_homem: "10" }), false);
  assert.equal(tipoAtivoValido("Dados"), true);
  assert.equal(tipoAtivoValido("dados"), false);
});

test("podeTrocarAtivo só sem estimativa financeira", () => {
  assert.equal(podeTrocarAtivo({ impacto_critico_total: null, impacto_alto_total: null }), true);
  assert.equal(podeTrocarAtivo({ impacto_critico_total: "0", impacto_alto_total: 0 }), true);
  assert.equal(podeTrocarAtivo({ impacto_critico_total: "15000.00", impacto_alto_total: null }), false);
});
