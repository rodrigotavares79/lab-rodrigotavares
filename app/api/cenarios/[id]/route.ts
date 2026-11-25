import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { riscosDosCenarios, resumoDe, validarCenarioCatalogo } from "@/lib/cenariosServidor";

export const dynamic = "force-dynamic";

// B27 · GET: cenário, riscos ligados (por projeto), resumo e risco corporativo.
export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  const { id } = await props.params;
  try {
    if (!/^\d+$/.test(id ?? "")) return NextResponse.json({ error: "Cenário inválido." }, { status: 400 });
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const [cenario] = await sql`
      SELECT c.*, rc.titulo AS corporativo_titulo, rc.status AS corporativo_status,
             rc.impacto_qualitativo AS corporativo_nivel, rc.dono_nome AS corporativo_dono
      FROM cenarios_risco c LEFT JOIN riscos rc ON rc.id = c.risco_corporativo_id
      WHERE c.id = ${id}
    `;
    if (!cenario) return NextResponse.json({ error: "Cenário não encontrado." }, { status: 404 });
    const riscos = await riscosDosCenarios(sql, Number(id));
    return NextResponse.json({
      cenario,
      riscos,
      resumo: resumoDe(riscos as any[]),
      podeEditar: !!guarda.usuario.permissoes.editarRiscos,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar o cenário." }, { status: 500 });
  }
}

// PATCH: edita o cenário do catálogo ou a situação ({ ativo }). Não muda o
// texto dos riscos já ligados: cada risco mantém o próprio cenário.
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  const { id } = await props.params;
  try {
    if (!/^\d+$/.test(id ?? "")) return NextResponse.json({ error: "Cenário inválido." }, { status: 400 });
    const body = await request.json().catch(() => ({}));
    const sql = sqlAuditado(guarda.usuario);
    if (Object.keys(body ?? {}).length === 1 && typeof body.ativo === "boolean") {
      const r = await sql`UPDATE cenarios_risco SET ativo = ${body.ativo} WHERE id = ${id} RETURNING id`;
      if (!r.length) return NextResponse.json({ error: "Cenário não encontrado." }, { status: 404 });
      return NextResponse.json({ ativo: body.ativo });
    }
    const v = validarCenarioCatalogo(body);
    if ("erro" in v) return NextResponse.json({ error: v.erro }, { status: 400 });
    const d = v.dados;
    const r = await sql`
      UPDATE cenarios_risco
      SET nome = ${d.nome}, evento = ${d.evento}, causa = ${d.causa}, consequencia = ${d.consequencia},
          categoria = ${d.categoria}, descricao = ${d.descricao}
      WHERE id = ${id} RETURNING id
    `;
    if (!r.length) return NextResponse.json({ error: "Cenário não encontrado." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao salvar o cenário." }, { status: 500 });
  }
}
