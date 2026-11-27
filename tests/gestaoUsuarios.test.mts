import { test } from "node:test";
import assert from "node:assert/strict";
import { validarMudancaPerfil, validarConvite, perfilPorGrupo, permissoesDoPerfil } from "../lib/perfisRiscos.ts";

const base = { atorId: "u_admin", alvoId: "u_alvo", administradores: 2 };

test("só Administrador e CISO gerenciam usuários", () => {
  for (const p of ["usuario", "analista_grc", "auditor", "coordenador", "gerente"] as const) {
    assert.equal(permissoesDoPerfil(p).gerirUsuarios, false, p);
    assert.match(validarMudancaPerfil({ ...base, ator: p, atual: "usuario", novo: "auditor" })!, /Administrador ou o CISO/);
  }
  assert.equal(permissoesDoPerfil("ciso").gerirUsuarios, true);
  assert.equal(permissoesDoPerfil("administrador").gerirUsuarios, true);
});

test("mudança válida e perfil inválido", () => {
  assert.equal(validarMudancaPerfil({ ...base, ator: "ciso", atual: "usuario", novo: "auditor" }), null);
  assert.equal(validarMudancaPerfil({ ...base, ator: "ciso", atual: "auditor", novo: "sem_acesso" }), null);
  assert.equal(validarMudancaPerfil({ ...base, ator: "administrador", atual: "usuario", novo: "root" }), "Perfil inválido.");
  assert.equal(validarMudancaPerfil({ ...base, ator: "administrador", atual: "auditor", novo: "auditor" }), "O usuário já tem esse perfil.");
});

test("ninguém altera o próprio perfil", () => {
  assert.match(validarMudancaPerfil({ ...base, ator: "administrador", alvoId: "u_admin", atual: "administrador", novo: "ciso" })!, /próprio perfil/);
});

test("CISO não concede nem altera o perfil Administrador", () => {
  assert.match(validarMudancaPerfil({ ...base, ator: "ciso", atual: "gerente", novo: "administrador" })!, /Só um Administrador/);
  assert.match(validarMudancaPerfil({ ...base, ator: "ciso", atual: "administrador", novo: "usuario" })!, /Só um Administrador/);
  assert.equal(validarMudancaPerfil({ ...base, ator: "administrador", atual: "gerente", novo: "administrador" }), null);
});

test("o último Administrador não pode ser rebaixado", () => {
  assert.match(validarMudancaPerfil({ ...base, ator: "administrador", atual: "administrador", novo: "ciso", administradores: 1 })!, /último Administrador/);
  assert.equal(validarMudancaPerfil({ ...base, ator: "administrador", atual: "administrador", novo: "ciso", administradores: 2 }), null);
});

test("perfil definido por grupo (SSO) fica travado", () => {
  assert.equal(perfilPorGrupo({ perfilRiscos: "auditor", perfilRiscosOrigem: "grupo" }), true);
  assert.equal(perfilPorGrupo({ perfilRiscos: "auditor" }), false);
  assert.match(validarMudancaPerfil({ ...base, ator: "administrador", atual: "auditor", novo: "gerente", porGrupo: true })!, /SSO/);
});

test("convite", () => {
  assert.equal(validarConvite({ ator: "ciso", email: "ana@monstros.com.br", perfil: "analista_grc" }), null);
  assert.equal(validarConvite({ ator: "ciso", email: "ana@", perfil: "analista_grc" }), "Informe um e-mail válido.");
  assert.equal(validarConvite({ ator: "ciso", email: "ana@monstros.com.br", perfil: "sem_acesso" }), "Escolha o perfil do usuário.");
  assert.match(validarConvite({ ator: "ciso", email: "ana@monstros.com.br", perfil: "administrador" })!, /Só um Administrador/);
  assert.match(validarConvite({ ator: "gerente", email: "ana@monstros.com.br", perfil: "usuario" })!, /Administrador ou o CISO/);
});
