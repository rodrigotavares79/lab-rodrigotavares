// Testes da validação de conteúdo das evidências (B12).
// Rodar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { validarConteudoEvidencia } from "../lib/assinaturaArquivo.ts";

const bytes = (...v: number[]) => new Uint8Array(v);
const str = (s: string) => new TextEncoder().encode(s);

test("PDF, PNG, JPEG e WEBP verdadeiros passam", () => {
  assert.equal(validarConteudoEvidencia("application/pdf", "laudo.pdf", str("%PDF-1.7 ...")), null);
  assert.equal(validarConteudoEvidencia("image/png", "tela.PNG", bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0)), null);
  assert.equal(validarConteudoEvidencia("image/jpeg", "foto.jpeg", bytes(0xff, 0xd8, 0xff, 0xe0)), null);
  assert.equal(validarConteudoEvidencia("image/webp", "a.webp", str("RIFF\u0000\u0000\u0000\u0000WEBPVP8 ")), null);
});

test("executável renomeado para .pdf é recusado", () => {
  assert.match(
    validarConteudoEvidencia("application/pdf", "relatorio.pdf", str("MZ\u0090\u0000 programa")) ?? "",
    /conteúdo do arquivo não corresponde/
  );
});

test("extensão incompatível com o tipo é recusada", () => {
  assert.match(validarConteudoEvidencia("application/pdf", "script.exe", str("%PDF-1.4")) ?? "", /extensão/);
  assert.match(validarConteudoEvidencia("image/png", "imagem.png.html", bytes(0x89, 0x50)) ?? "", /extensão/);
});

test("texto com byte nulo ou cabeçalho de executável é recusado", () => {
  assert.equal(validarConteudoEvidencia("text/csv", "dados.csv", str("a;b\n1;2\n")), null);
  assert.match(validarConteudoEvidencia("text/plain", "log.txt", bytes(0x41, 0x00, 0x42)) ?? "", /não corresponde/);
  assert.match(validarConteudoEvidencia("text/plain", "x.txt", str("MZ...")) ?? "", /não corresponde/);
});

test("XLSX/DOCX precisam ser ZIP", () => {
  const tipo = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  assert.equal(validarConteudoEvidencia(tipo, "ata.docx", bytes(0x50, 0x4b, 0x03, 0x04, 0x14)), null);
  assert.match(validarConteudoEvidencia(tipo, "ata.docx", str("%PDF-1.4")) ?? "", /não corresponde/);
});

test("tipo fora da lista e arquivo vazio", () => {
  assert.match(validarConteudoEvidencia("text/html", "pagina.html", str("<html>")) ?? "", /não permitido/);
  assert.match(validarConteudoEvidencia("application/pdf", "vazio.pdf", new Uint8Array()) ?? "", /vazio/);
});
