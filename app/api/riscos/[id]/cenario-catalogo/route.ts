import { NextRequest, NextResponse } from "next/server";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";

export const dynamic = "force-dynamic";

// B27 · PUT { cenarioId | null } — liga (ou desliga) o risco a um cenário do
// catálogo. O texto do risco não muda.
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  const { id } = await props.params;
  try {
    if (!/^\d+$/.test(id ?? "")) return NextResponse.json({ error: "ID de risco inválido." }, { status: 400 });
    const body = await request.json().catch(() => ({}));
    const cenarioId = body?.cenarioId === null || body?.cenarioId === "" ? null : Number(body?.cenarioId);
    if (cenarioId !== null && !Number.isInteger(cenarioId)) {
      return NextResponse.json({ error: "Cenário inválido." }, { status: 400 });
    }
    const sql = sqlAuditado(guarda.usuario);
    if (cenarioId !== null) {
      const [c] = await sql`SELECT ativo FROM cenarios_risco WHERE id = ${cenarioId}`;
      if (!c) return NextResponse.json({ error: "Cenário não encontrado." }, { status: 404 });
      if (!c.ativo) return NextResponse.json({ error: "Este cenário está inativo no catálogo." }, { status: 400 });
    }
    const r = await sql`UPDATE riscos SET cenario_id = ${cenarioId} WHERE id = ${id} RETURNING id`;
    if (!r.length) return NextResponse.json({ error: "Risco não encontrado." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao ligar o risco ao cenário." }, { status: 500 });
  }
}
