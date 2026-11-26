// Testes dos indicadores-chave de risco (B21).
// Rodar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dataReferencia,
  faixaKri,
  lerCsvMedicoes,
  motivoAntecipacao,
  numero,
  proximoCodigoKri,
  situacaoMedicao,
  validarKri,
} from "../lib/kriRisco.ts";

const MAIOR = { direcao: "maior_pior", limite_amarelo: 2, limite_vermelho: 5 };
const MENOR = { direcao: "menor_pior", limite_amarelo: 95, limite_vermelho: 90 };

test("faixa: o limiar conta como atingido, nas duas direções", () => {
  assert.equal(faixaKri(0, MAIOR), "verde");
  assert.equal(faixaKri(2, MAIOR), "amarelo");
  assert.equal(faixaKri(4.9, MAIOR), "amarelo");
  assert.equal(faixaKri(5, MAIOR), "vermelho");
  assert.equal(faixaKri(99, MENOR), "verde");
  assert.equal(faixaKri(95, MENOR), "amarelo");
  assert.equal(faixaKri(90, MENOR), "vermelho");
  assert.equal(faixaKri(80, MENOR), "vermelho");
});

test("cadastro: limiares coerentes com a direção e campos obrigatórios", () => {
  const ok = {
    nome: "CVEs críticas abertas",
    metrica: "CVEs com CVSS ≥ 9 abertas há mais de 15 dias",
    unidade: "CVEs",
    direcao: "maior_pior",
    limiteAmarelo: "2",
    limiteVermelho: "5",
    fonte: "Varredura mensal",
    frequencia: "Mensal",
    riscoId: 26,
  };
  assert.equal(validarKri(ok), null);
  assert.match(validarKri({ ...ok, limiteAmarelo: "5", limiteVermelho: "2" })!, /menor que o vermelho/);
  assert.equal(validarKri({ ...ok, direcao: "menor_pior", limiteAmarelo: "95", limiteVermelho: "90" }), null);
  assert.match(validarKri({ ...ok, direcao: "menor_pior" })!, /maior que o vermelho/);
  assert.match(validarKri({ ...ok, frequencia: "Diária" })!, /frequência/);
  assert.match(validarKri({ ...ok, riscoId: "" })!, /Vincule/);
  assert.match(validarKri({ ...ok, fonte: " " })!, /fonte/);
});

test("números em formato brasileiro e datas de referência", () => {
  assert.equal(numero("1.234,5"), 1234.5);
  assert.equal(numero("97,5"), 97.5);
  assert.equal(numero("3.5"), 3.5);
  assert.equal(numero("abc"), null);
  assert.equal(dataReferencia("30/11/2026"), "2026-11-30");
  assert.equal(dataReferencia("2026-11-30"), "2026-11-30");
  assert.equal(dataReferencia("11/2026"), "2026-11-01");
  assert.equal(dataReferencia("31/02/2026"), null);
});

test("medição atrasada passa da frequência", () => {
  assert.equal(situacaoMedicao(null, "Mensal", "2026-11-26"), "sem_medicao");
  assert.equal(situacaoMedicao("2026-10-31", "Mensal", "2026-11-26"), "em_dia");
  assert.equal(situacaoMedicao("2026-10-01", "Mensal", "2026-11-26"), "atrasada");
  assert.equal(situacaoMedicao("2026-11-10", "Semanal", "2026-11-26"), "atrasada");
});

test("CSV: separador ;, decimal com vírgula, cabeçalho e erros por linha", () => {
  const { linhas, erros } = lerCsvMedicoes(
    "codigo;referencia;valor;observacao\nKRI-001;30/11/2026;4;varredura\nkri-002;11/2026;97,5\nKRI-003;32/11/2026;1\nXYZ;01/11/2026;1\n\nKRI-004;01/11/2026;abc"
  );
  assert.deepEqual(linhas.map((l) => [l.codigo, l.referencia, l.valor, l.observacao]), [
    ["KRI-001", "2026-11-30", 4, "varredura"],
    ["KRI-002", "2026-11-01", 97.5, null],
  ]);
  assert.equal(erros.length, 3);
  assert.match(erros[0], /Linha 4: data/);
  assert.match(erros[1], /Linha 5: código/);
  assert.match(erros[2], /Linha 7: valor/);
});

test("código sequencial e texto do alerta para o risco", () => {
  assert.equal(proximoCodigoKri([]), "KRI-001");
  assert.equal(proximoCodigoKri(["KRI-001", "KRI-009", "OUTRO"]), "KRI-010");
  assert.equal(
    motivoAntecipacao({ codigo: "KRI-001", unidade: "CVEs", ...MAIOR }, 6, "2026-11-30"),
    "KRI-001 no vermelho em 30/11/2026: 6 CVEs (limiar ≥ 5 CVEs)."
  );
});
