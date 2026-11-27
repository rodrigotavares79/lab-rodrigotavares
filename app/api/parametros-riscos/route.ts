import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { NIVEIS_REVISAO, validarParametros } from "@/lib/parametrosRegras";

export const dynamic = "force-dynamic";

// B29 · GET: prazo de tratamento e prazos de revisão por nível.
export async function GET() {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const [[prazo], revisao] = await Promise.all([
      sql`SELECT valor FROM parametros_politica WHERE chave = 'prazo_tratamento_dias'`,
      sql`SELECT nivel, dias FROM parametros_revisao`,
    ]);
    const mapa = Object.fromEntries(revisao.map((r: any) => [r.nivel, r.dias]));
    return NextResponse.json({
      prazoTratamentoDias: prazo?.valor ?? null,
      revisao: Object.fromEntries(NIVEIS_REVISAO.map((n) => [n, mapa[n] ?? null])),
      podeEditar: guarda.usuario.permissoes.gerirUsuarios,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar os parâmetros." }, { status: 500 });
  }
}

// B29 · PUT: grava os parâmetros (Administrador e CISO). Vale na hora para os
// indicadores de prazo de tratamento e de revisões vencidas.
export async function PUT(request: NextRequest) {
  const guarda = await exigirPermissao("gerirUsuarios");
  if (guarda.resposta) return guarda.resposta;
  try {
    const v = validarParametros((await request.json().catch(() => ({}))) ?? {});
    if (typeof v === "string") return NextResponse.json({ error: v }, { status: 400 });
    const sql = sqlAuditado(guarda.usuario);
    await sql`
      INSERT INTO parametros_politica (chave, valor, descricao)
      VALUES ('prazo_tratamento_dias', ${v.prazoTratamentoDias}, 'Dias, a partir do cadastro, para um risco Alto ou Crítico ter tratamento definido')
      ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor WHERE parametros_politica.valor IS DISTINCT FROM EXCLUDED.valor
    `;
    for (const n of NIVEIS_REVISAO) {
      await sql`
        INSERT INTO parametros_revisao (nivel, dias) VALUES (${n}, ${v.revisao[n]})
        ON CONFLICT (nivel) DO UPDATE SET dias = EXCLUDED.dias WHERE parametros_revisao.dias IS DISTINCT FROM EXCLUDED.dias
      `;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao gravar os parâmetros." }, { status: 500 });
  }
}
