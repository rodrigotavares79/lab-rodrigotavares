import { test } from "node:test";
import assert from "node:assert/strict";
import {
  trechoParaTitulo,
  montarTituloRisco,
  cenarioCompleto,
  nomeExibicaoRisco,
  validarCenario,
} from "../lib/cenarioRisco.ts";

test("trechoParaTitulo põe a inicial em minúscula e tira ponto final", () => {
  assert.equal(trechoParaTitulo("  Falha na restauração do backup. "), "falha na restauração do backup");
  assert.equal(trechoParaTitulo("Ataque e movimentação lateral."), "ataque e movimentação lateral");
});

test("trechoParaTitulo preserva siglas no início", () => {
  assert.equal(trechoParaTitulo("SSL expirado"), "SSL expirado");
  assert.equal(trechoParaTitulo("CVEs não tratadas"), "CVEs não tratadas");
  assert.equal(trechoParaTitulo("DNS incorreto"), "DNS incorreto");
});

test("trechoParaTitulo lida com vazio e letra única", () => {
  assert.equal(trechoParaTitulo(null), "");
  assert.equal(trechoParaTitulo("   "), "");
  assert.equal(trechoParaTitulo("A"), "A");
});

test("montarTituloRisco segue o padrão da metodologia", () => {
  assert.equal(
    montarTituloRisco({
      causa: "Rotina de backup sem verificação de execução",
      evento: "Falha na execução do backup",
      consequencia: "Dados recentes sem cópia válida para recuperação.",
    }),
    "Risco de falha na execução do backup em razão de rotina de backup sem verificação de execução, resultando em dados recentes sem cópia válida para recuperação"
  );
});

test("montarTituloRisco devolve null com cenário incompleto", () => {
  assert.equal(montarTituloRisco({ causa: "x causa", evento: "", consequencia: "y" }), null);
  assert.equal(cenarioCompleto({ causa: "a", evento: "b", consequencia: "  " }), false);
  assert.equal(cenarioCompleto({ causa: "a", evento: "b", consequencia: "c" }), true);
});

test("nomeExibicaoRisco usa título, depois gatilho, depois categoria", () => {
  assert.equal(nomeExibicaoRisco({ titulo: "Risco de X", gatilho: "G" }), "Risco de X");
  assert.equal(nomeExibicaoRisco({ titulo: null, gatilho: "G", categoria: "C" }), "G");
  assert.equal(nomeExibicaoRisco({ categoria: "C" }), "C");
  assert.equal(nomeExibicaoRisco({}), "Risco sem descrição");
});

test("validarCenario exige os três campos com tamanho mínimo e máximo", () => {
  assert.match(validarCenario({ causa: "", evento: "evento ok", consequencia: "consequência ok" })!, /Causa/);
  assert.match(validarCenario({ causa: "causa ok", evento: "ev", consequencia: "consequência ok" })!, /Evento.*5/);
  assert.match(
    validarCenario({ causa: "causa ok", evento: "evento ok", consequencia: "x".repeat(301) })!,
    /Consequência.*300/
  );
  assert.equal(validarCenario({ causa: "causa ok", evento: "evento ok", consequencia: "consequência ok" }), null);
});
