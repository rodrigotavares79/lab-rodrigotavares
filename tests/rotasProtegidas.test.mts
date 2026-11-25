// Varredura das rotas de API do Gestão de Riscos (B11): todo handler
// exportado precisa chamar exigirPermissao(...). Falha se alguém criar uma
// rota nova do módulo sem checagem no servidor.
// Rodar: npm test (a partir da raiz do projeto)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const MARCAS_DO_MODULO = [
  /\briscos\b/, /\bplanos_acao\b/, /\bacoes\b/, /\bfatores_risco\b/, /\blog_alteracoes\b/,
  /\beventos_seguranca\b/, /indicadoresRiscos/, /usuariosRiscos/, /riscosAuth/,
];
// Rotas que só devolvem o perfil do próprio usuário logado.
const EXCECOES = new Set(["app/api/perfil-riscos/route.ts"]);
const FORA_DO_MODULO = /condominio|chamado|comunicado|sistemas-ia|catalogo|fornecedor/;

function rotas(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return rotas(caminho);
    return nome === "route.ts" ? [caminho] : [];
  });
}

const doModulo = rotas("app/api").filter((f) => {
  if (FORA_DO_MODULO.test(f) || EXCECOES.has(f)) return false;
  const s = readFileSync(f, "utf8");
  return MARCAS_DO_MODULO.some((r) => r.test(s));
});

test("encontra as rotas do módulo", () => {
  assert.ok(doModulo.length >= 25, `só ${doModulo.length} rotas encontradas`);
});

for (const arquivo of doModulo) {
  test(`${arquivo}: todo handler confere permissão no servidor`, () => {
    const s = readFileSync(arquivo, "utf8");
    const partes = s.split(/(?=export async function (?:GET|POST|PATCH|PUT|DELETE)\b)/).slice(1);
    assert.ok(partes.length > 0, "nenhum handler exportado");
    for (const parte of partes) {
      const nome = /export async function (\w+)/.exec(parte)?.[1];
      assert.match(parte, /exigirPermissao\("\w+"\)/, `${nome} sem exigirPermissao`);
    }
  });
}
