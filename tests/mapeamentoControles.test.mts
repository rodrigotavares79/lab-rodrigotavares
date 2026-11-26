// Testes do mapeamento curado de frameworks (B24).
// Rodar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { TEMAS, TEMA_GERAL, mapearRisco } from "../lib/conformidadeFrameworks.ts";
import { buscarControle, chave, cobertura, montarCatalogo, sugestoes, validarDecisao } from "../lib/mapeamentoControles.ts";

const CAT = montarCatalogo([...TEMAS, TEMA_GERAL]);

test("catálogo sem repetição e com os controles dos temas", () => {
  const iso = CAT.iso.map((c) => c.id);
  assert.equal(new Set(iso).size, iso.length);
  assert.ok(iso.includes("A.8.8"));
  assert.ok(CAT.cis.some((c) => c.id === "CIS 7"));
  assert.equal(buscarControle(CAT, "iso", "A.8.8")?.titulo, "Gestão de vulnerabilidades técnicas");
  assert.equal(buscarControle(CAT, "iso", "A.99.9"), null);
  assert.equal(buscarControle(CAT, "cobit", "A.8.8"), null);
});

test("palavra-chave vira sugestão; biblioteca vem antes e decididos somem", () => {
  const m = mapearRisco("Detecção de vulnerabilidade crítica com CVSS igual ou superior a 9,0");
  const todas = sugestoes(CAT, m, [{ framework: "iso", controle_id: "A.8.8", cenario: "CEN-003" }], new Set());
  assert.equal(todas[0].fonte, "biblioteca");
  assert.equal(todas[0].id, "A.8.8");
  assert.equal(todas.filter((s) => s.id === "A.8.8").length, 1, "a biblioteca não duplica a palavra-chave");
  assert.ok(todas.some((s) => s.fonte === "palavra-chave" && s.id === "CIS 7"));
  const restantes = sugestoes(CAT, m, [], new Set([chave("cis", "CIS 7"), chave("iso", "A.8.8")]));
  assert.ok(!restantes.some((s) => s.id === "CIS 7" || s.id === "A.8.8"));
});

test("risco sem tema: só a biblioteca sugere (o genérico não vira sugestão)", () => {
  const m = mapearRisco("texto sem nenhum termo conhecido");
  assert.deepEqual(sugestoes(CAT, m, [], new Set()), []);
});

test("cobertura: cada controle conta uma vez, pelo pior status", () => {
  const c = cobertura([
    { framework: "iso", controle_id: "A.8.8", status: "Implementado" },
    { framework: "iso", controle_id: "A.8.8", status: "Parcial" },
    { framework: "iso", controle_id: "A.8.13", status: "Implementado" },
    { framework: "iso", controle_id: "A.5.15", status: "Ausente" },
    { framework: "cis", controle_id: "CIS 7", status: "Implementado" },
  ]);
  const iso = c.find((x) => x.framework === "iso")!;
  assert.deepEqual([iso.controles, iso.implementado, iso.parcial, iso.ausente, iso.percentual], [3, 1, 1, 1, 50]);
  assert.equal(c.find((x) => x.framework === "cis")!.percentual, 100);
  assert.equal(c.find((x) => x.framework === "nist")!.percentual, null);
});

test("decisão: confirmado exige status; descartado não", () => {
  assert.equal(validarDecisao(CAT, { framework: "iso", controleId: "A.8.8", situacao: "confirmado", status: "Parcial" }), null);
  assert.match(validarDecisao(CAT, { framework: "iso", controleId: "A.8.8", situacao: "confirmado" })!, /status/);
  assert.equal(validarDecisao(CAT, { framework: "iso", controleId: "A.8.8", situacao: "descartado" }), null);
  assert.match(validarDecisao(CAT, { framework: "iso", controleId: "X", situacao: "descartado" })!, /desconhecido/);
  assert.match(validarDecisao(CAT, { framework: "iso", controleId: "A.8.8", situacao: "talvez" })!, /inválida/);
});
