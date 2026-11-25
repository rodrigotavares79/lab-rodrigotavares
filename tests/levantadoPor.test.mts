// Testes do "Levantado por" e do limite de e-mails (B10).
// Rodar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { LIMITE_EMAILS_POR_HORA, podeEnviarConfirmacao, resolverLevantadoPorImportacao } from "../lib/levantadoPor.ts";

const sistema = ["ana@exemplo.com", "Pedro@Exemplo.com"];

test("importação: em branco vale quem importa", () => {
  assert.deepEqual(resolverLevantadoPorImportacao("  ", sistema, "rodrigo@exemplo.com"), { email: "rodrigo@exemplo.com" });
  assert.deepEqual(resolverLevantadoPorImportacao(undefined, sistema, "rodrigo@exemplo.com"), { email: "rodrigo@exemplo.com" });
});

test("importação: usuário do sistema é aceito com o e-mail cadastrado", () => {
  assert.deepEqual(resolverLevantadoPorImportacao("pedro@exemplo.COM", sistema, "x@x.com"), { email: "Pedro@Exemplo.com" });
});

test("importação: e-mail de fora do sistema é recusado", () => {
  const r = resolverLevantadoPorImportacao("externo@gmail.com", sistema, "x@x.com");
  assert.ok("erro" in r && /não é um usuário do sistema/.test(r.erro));
});

test("limite de e-mails por hora", () => {
  assert.equal(podeEnviarConfirmacao(0), true);
  assert.equal(podeEnviarConfirmacao(LIMITE_EMAILS_POR_HORA - 1), true);
  assert.equal(podeEnviarConfirmacao(LIMITE_EMAILS_POR_HORA), false);
});
