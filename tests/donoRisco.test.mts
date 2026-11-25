import { test } from "node:test";
import assert from "node:assert/strict";
import { validarContato, resolverPontoFocal, analistasGrc } from "../lib/donoRisco.ts";

const usuarios = [
  { email: "rodrigo@x.com", nome: "Rodrigo", chave: "administrador" },
  { email: "pedro@x.com", nome: "Pedro", chave: "analista_grc" },
];

test("validarContato normaliza e exige nome, e-mail e área", () => {
  assert.match((validarContato({ nome: "Jo", email: "a@b.co", area: "RH" }) as any).erro, /nome/);
  assert.match((validarContato({ nome: "Joana", email: "joana", area: "RH" }) as any).erro, /e-mail/);
  assert.match((validarContato({ nome: "Joana", email: "j@b.co", area: "" }) as any).erro, /área/);
  assert.deepEqual((validarContato({ nome: " Joana  Lima ", email: " Joana@Empresa.com ", area: "Financeiro" }) as any).contato, {
    nome: "Joana Lima",
    email: "joana@empresa.com",
    area: "Financeiro",
    cargo: null,
  });
});

test("validarContato recusa e-mail de usuário do sistema", () => {
  assert.match((validarContato({ nome: "Pedro", email: "PEDRO@x.com", area: "TI" }, ["pedro@x.com"]) as any).erro, /usuário do sistema/);
});

test("resolverPontoFocal usa o único Analista GRC ou valida a escolha", () => {
  assert.equal((resolverPontoFocal(usuarios, "") as any).pontoFocal.email, "pedro@x.com");
  assert.equal((resolverPontoFocal(usuarios, "Pedro@X.com") as any).pontoFocal.nome, "Pedro");
  assert.match((resolverPontoFocal(usuarios, "rodrigo@x.com") as any).erro, /Analista GRC/);
  const dois = [...usuarios, { email: "ana@x.com", nome: "Ana", chave: "analista_grc" }];
  assert.match((resolverPontoFocal(dois, null) as any).erro, /Escolha/);
  assert.match((resolverPontoFocal([usuarios[0]], "") as any).erro, /Não há/);
  assert.equal(analistasGrc(dois).length, 2);
});
