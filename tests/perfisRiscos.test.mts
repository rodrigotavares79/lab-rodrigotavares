// Testes da matriz de permissões (B11): o que cada perfil pode e não pode.
// Rodar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { MATRIZ_PERMISSOES, parsePerfilRiscos, permissoesDoPerfil } from "../lib/perfisRiscos.ts";

test("conta sem perfilRiscos não tem acesso nenhum", () => {
  for (const meta of [{}, null, undefined, { perfilCondominio: "morador" }]) {
    const perfil = parsePerfilRiscos(meta as any);
    assert.equal(perfil, "sem_acesso");
    assert.deepEqual(Object.values(permissoesDoPerfil(perfil)).filter(Boolean), []);
  }
});

test("Leitura só lê", () => {
  assert.deepEqual(permissoesDoPerfil(parsePerfilRiscos({ perfilRiscos: "usuario" })), {
    ler: true, editarRiscos: false, editarPlanos: false, verAuditoria: false, auditar: false, gerirUsuarios: false,
  });
});

test("Analista GRC executa, mas não audita", () => {
  const p = permissoesDoPerfil("analista_grc");
  assert.equal(p.editarPlanos, true);
  assert.equal(p.auditar, false);
});

test("Auditor audita, mas não edita riscos nem planos", () => {
  const p = permissoesDoPerfil(parsePerfilRiscos({ perfilRiscos: "auditor" }));
  assert.deepEqual(p, { ler: true, editarRiscos: false, editarPlanos: false, verAuditoria: true, auditar: true, gerirUsuarios: false });
});

test("Coordenador e Gerente auditam, mas não editam planos", () => {
  for (const perfil of ["coordenador", "gerente"] as const) {
    assert.equal(permissoesDoPerfil(perfil).auditar, true);
    assert.equal(permissoesDoPerfil(perfil).editarPlanos, false);
  }
});

test("quem pode auditar nunca pode editar planos, exceto Administrador (B07 cobre por plano)", () => {
  for (const [perfil, p] of Object.entries(MATRIZ_PERMISSOES)) {
    if (perfil === "administrador") continue;
    assert.ok(!(p.auditar && p.editarPlanos), perfil);
  }
});

test("toda permissão exige ler", () => {
  for (const [perfil, p] of Object.entries(MATRIZ_PERMISSOES)) {
    if (p.editarRiscos || p.editarPlanos || p.verAuditoria || p.auditar || p.gerirUsuarios) assert.ok(p.ler, perfil);
  }
});

test("valores antigos e desconhecidos", () => {
  assert.equal(parsePerfilRiscos({ perfilRiscos: "gestor" }), "gerente");
  assert.equal(parsePerfilRiscos({ perfilRiscos: "analista_senior" }), "analista_grc");
  assert.equal(parsePerfilRiscos({ perfilRiscos: "qualquer" }), "usuario");
});
