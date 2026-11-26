import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { CATALOGO_CONTROLES } from "@/lib/catalogoControles";
import { buscarControle } from "@/lib/mapeamentoControles";

export const dynamic = "force-dynamic";

// B24 · Biblioteca de cenários → controles, revisada manualmente.
// GET: controles do cenário e o catálogo para escolher.
export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  const { id } = await props.params;
  try {
    if (!/^\d+$/.test(id ?? "")) return NextResponse.json({ error: "Cenário inválido." }, { status: 400 });
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const controles = await sql`
      SELECT id, framework, controle_id, controle_titulo, revisado_por_nome, revisado_em
      FROM cenario_controles WHERE cenario_id = ${id}
      ORDER BY framework, controle_id
    `;
    return NextResponse.json({ controles, catalogo: CATALOGO_CONTROLES, podeEditar: guarda.usuario.permissoes.editarRiscos });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar os controles do cenário." }, { status: 500 });
  }
}

// B24 · POST { framework, controleId }: inclui o controle na biblioteca do cenário.
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  const { id } = await props.params;
  try {
    if (!/^\d+$/.test(id ?? "")) return NextResponse.json({ error: "Cenário inválido." }, { status: 400 });
    const d = await request.json().catch(() => ({}));
    const c = buscarControle(CATALOGO_CONTROLES, String(d?.framework ?? ""), String(d?.controleId ?? ""));
    if (!c) return NextResponse.json({ error: "Controle desconhecido." }, { status: 400 });
    const sql = sqlAuditado(guarda.usuario);
    const [cen] = await sql`SELECT id FROM cenarios_risco WHERE id = ${id}`;
    if (!cen) return NextResponse.json({ error: "Cenário não encontrado." }, { status: 404 });
    await sql`
      INSERT INTO cenario_controles (cenario_id, framework, controle_id, controle_titulo, revisado_por_email, revisado_por_nome)
      VALUES (${id}, ${c.framework}, ${c.id}, ${c.titulo}, ${guarda.usuario.email}, ${guarda.usuario.nome})
      ON CONFLICT (cenario_id, framework, controle_id) DO NOTHING
    `;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao incluir o controle." }, { status: 500 });
  }
}

// B24 · DELETE ?framework&controleId: tira o controle da biblioteca do cenário.
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  const { id } = await props.params;
  try {
    if (!/^\d+$/.test(id ?? "")) return NextResponse.json({ error: "Cenário inválido." }, { status: 400 });
    const q = request.nextUrl.searchParams;
    const sql = sqlAuditado(guarda.usuario);
    await sql`
      DELETE FROM cenario_controles
      WHERE cenario_id = ${id} AND framework = ${q.get("framework") ?? ""} AND controle_id = ${q.get("controleId") ?? ""}
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao retirar o controle." }, { status: 500 });
  }
}
