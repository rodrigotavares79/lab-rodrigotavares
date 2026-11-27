// Testes das regras de assessments (B28): maturidade, fluxo e sugestão de risco.
// Rodar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  AREAS_ASSESSMENT,
  CATEGORIA_POR_AREA,
  calcularMaturidade,
  faixaMaturidade,
  podeEditar,
  proximoCodigo,
  respostaCompleta,
  sugerirRisco,
  validarNovoAssessment,
  validarTransicao,
  type Pergunta,
} from "../lib/assessmentRegras.ts";
import { NOMES_CATEGORIAS } from "../lib/politicaRiscos.ts";

const P: Pergunta[] = [
  { id: 1, codigo: "03.01", area: "Gestão de riscos", texto: "Existe um processo de ERM corporativo?", tipo: "objetiva" },
  { id: 2, codigo: "03.02", area: "Gestão de riscos", texto: "Os riscos cibernéticos estão integrados ao ERM?", tipo: "objetiva" },
  { id: 3, codigo: "03.03", area: "Gestão de riscos", texto: "Qual metodologia é usada?", tipo: "descritiva" },
  { id: 4, codigo: "03.04", area: "Gestão de riscos", texto: "O apetite a risco foi aprovado?", tipo: "objetiva" },
  { id: 5, codigo: "13.05", area: "Endpoint gerenciado", texto: "Os discos são criptografados?", tipo: "objetiva" },
  { id: 6, codigo: "13.06", area: "Endpoint gerenciado", texto: "O admin local foi removido?", tipo: "objetiva" },
];

test("maturidade: Sim 1, Parcial 0,5, Não 0, N/A fora da conta", () => {
  const m = calcularMaturidade(P, [
    { pergunta_id: 1, resposta: "Sim", descritivo: null },
    { pergunta_id: 2, resposta: "Parcial", descritivo: null },
    { pergunta_id: 4, resposta: "N/A", descritivo: null },
    { pergunta_id: 5, resposta: "Não", descritivo: null },
  ], ["Gestão de riscos", "Endpoint gerenciado"]);
  const gr = m.areas[0];
  assert.equal(gr.area, "Gestão de riscos");
  assert.equal(gr.aplicaveis, 2);
  assert.equal(gr.indice, 75);
  assert.equal(gr.na, 1);
  assert.equal(gr.respondidas, 3); // descritiva sem texto não conta
  const ep = m.areas[1];
  assert.equal(ep.indice, 0);
  // geral pondera por aplicáveis: (1 + 0,5 + 0) / 3
  assert.equal(m.geral, 50);
  assert.equal(m.respondidas, 4);
  assert.equal(m.perguntas, 6);
});

test("maturidade: área sem objetiva aplicável fica sem índice; áreas fora do escopo não entram", () => {
  const m = calcularMaturidade(P, [{ pergunta_id: 5, resposta: "N/A", descritivo: null }], ["Endpoint gerenciado"]);
  assert.equal(m.areas.length, 1);
  assert.equal(m.areas[0].indice, null);
  assert.equal(m.geral, null);
});

test("maturidade segue a ordem oficial das áreas, não a ordem escolhida", () => {
  const m = calcularMaturidade(P, [], ["Endpoint gerenciado", "Gestão de riscos"]);
  assert.deepEqual(m.areas.map((a) => a.area), ["Gestão de riscos", "Endpoint gerenciado"]);
});

test("descritiva só conta respondida com texto", () => {
  assert.equal(respostaCompleta(P[2], { pergunta_id: 3, resposta: null, descritivo: "   " }), false);
  assert.equal(respostaCompleta(P[2], { pergunta_id: 3, resposta: null, descritivo: "FAIR" }), true);
  assert.equal(respostaCompleta(P[0], { pergunta_id: 1, resposta: "Talvez", descritivo: null }), false);
});

test("faixas de maturidade", () => {
  assert.equal(faixaMaturidade(null), null);
  assert.equal(faixaMaturidade(39.9), "Inicial");
  assert.equal(faixaMaturidade(40), "Em desenvolvimento");
  assert.equal(faixaMaturidade(70), "Definido");
  assert.equal(faixaMaturidade(90), "Gerenciado");
});

const analista = { email: "ana@ex.com", editarRiscos: true, auditar: false };
const coord = { email: "coord@ex.com", editarRiscos: true, auditar: true };
const auditor = { email: "aud@ex.com", editarRiscos: false, auditar: true };

test("enviar para revisão exige zero pendências e perfil que conduz", () => {
  assert.match(validarTransicao({ de: "Rascunho", para: "Em revisão", ator: analista, analistaEmail: "ana@ex.com", pendentes: 2 }) ?? "", /2 pergunta/);
  assert.equal(validarTransicao({ de: "Rascunho", para: "Em revisão", ator: analista, analistaEmail: "ana@ex.com", pendentes: 0 }), null);
  assert.match(validarTransicao({ de: "Rascunho", para: "Em revisão", ator: auditor, analistaEmail: "ana@ex.com", pendentes: 0 }) ?? "", /não pode conduzir/);
});

test("revisão: segregação de funções e motivo na devolução", () => {
  const condutorCoord = { ...coord };
  assert.match(validarTransicao({ de: "Em revisão", para: "Concluído", ator: condutorCoord, analistaEmail: "COORD@ex.com", pendentes: 0 }) ?? "", /não pode revisá-lo/);
  assert.equal(validarTransicao({ de: "Em revisão", para: "Concluído", ator: auditor, analistaEmail: "ana@ex.com", pendentes: 0 }), null);
  assert.match(validarTransicao({ de: "Em revisão", para: "Concluído", ator: analista, analistaEmail: "outro@ex.com", pendentes: 0 }) ?? "", /não pode revisar/);
  assert.match(validarTransicao({ de: "Em revisão", para: "Rascunho", ator: coord, analistaEmail: "ana@ex.com", pendentes: 0, motivo: " " }) ?? "", /motivo/);
  assert.equal(validarTransicao({ de: "Em revisão", para: "Rascunho", ator: coord, analistaEmail: "ana@ex.com", pendentes: 0, motivo: "Falta evidência em 10.06" }), null);
});

test("concluído trava; saltos de status são recusados", () => {
  assert.match(validarTransicao({ de: "Concluído", para: "Rascunho", ator: coord, analistaEmail: "ana@ex.com", pendentes: 0 }) ?? "", /concluído/);
  assert.match(validarTransicao({ de: "Rascunho", para: "Concluído", ator: coord, analistaEmail: "ana@ex.com", pendentes: 0 }) ?? "", /Não é possível/);
  assert.equal(podeEditar("Rascunho", analista), true);
  assert.equal(podeEditar("Em revisão", analista), false);
  assert.equal(podeEditar("Rascunho", auditor), false);
});

test("sugestão de risco só para Não ou Parcial, com causa do descritivo", () => {
  assert.equal(sugerirRisco(P[0], { pergunta_id: 1, resposta: "Sim", descritivo: null }, "ASM-001"), null);
  assert.equal(sugerirRisco(P[2], { pergunta_id: 3, resposta: null, descritivo: "nada" }, "ASM-001"), null);
  const s = sugerirRisco(P[4], { pergunta_id: 5, resposta: "Não", descritivo: null }, "ASM-007")!;
  assert.equal(s.categoria, "Tecnológico");
  assert.equal(s.causa, "ausência de controle: Os discos são criptografados");
  assert.equal(s.gatilho, "Assessment ASM-007, pergunta 13.05 (Não)");
  const d = sugerirRisco(P[1], { pergunta_id: 2, resposta: "Parcial", descritivo: "x".repeat(400) }, "ASM-001")!;
  assert.ok(d.causa.length <= 300);
});

test("categorias sugeridas existem no cadastro e cobrem todas as áreas", () => {
  for (const a of AREAS_ASSESSMENT) assert.ok(NOMES_CATEGORIAS.includes(CATEGORIA_POR_AREA[a]), a);
});

test("banco de perguntas da migração usa só as áreas conhecidas", () => {
  const sql = readFileSync(new URL("../db/migrations/0036_assessments.sql", import.meta.url), "utf8");
  const linhas = [...sql.matchAll(/^\s+\('(\d{2}\.\d{2})', '([^']+)', (\d+), (\d+), '/gm)];
  assert.equal(linhas.length, 145);
  for (const [, , area, ordem] of linhas) assert.equal(AREAS_ASSESSMENT[Number(ordem) - 1], area);
  assert.equal(new Set(linhas.map((l) => l[1])).size, 145);
});

test("código sequencial e validação do cadastro", () => {
  assert.equal(proximoCodigo([]), "ASM-001");
  assert.equal(proximoCodigo(["ASM-009", "ASM-012", "lixo"]), "ASM-013");
  const ok = { titulo: "Assessment do ERP", tipo: "Projeto", projetoId: 3, escopo: "Ambiente de produção do ERP", areas: ["Gestão de riscos"] };
  assert.equal(validarNovoAssessment(ok), null);
  assert.match(validarNovoAssessment({ ...ok, areas: [] }) ?? "", /área/);
  assert.match(validarNovoAssessment({ ...ok, areas: ["Inventada"] }) ?? "", /desconhecida/);
  assert.match(validarNovoAssessment({ ...ok, tipo: "Outro" }) ?? "", /Tipo/);
});
