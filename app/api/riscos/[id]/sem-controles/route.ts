import { NextRequest, NextResponse } from "next/server";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { JUSTIFICATIVA_MINIMA } from "@/lib/controlesRisco";

export const dynamic = "force-dynamic";

// B15 · PUT { justificativa } — declara que o risco não tem controles
// existentes (só para risco sem fatores cadastrados). DELETE desfaz.
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  const { id } = await props.params;
  try {
    if (!/^\d+$/.test(id ?? "")) return NextResponse.json({ error: "ID de risco inválido." }, { status: 400 });
    const body = await request.json().catch(() => ({}));
    const justificativa = typeof body?.justificativa === "string" ? body.justificativa.trim().slice(0, 2000) : "";
    if (justificativa.length < JUSTIFICATIVA_MINIMA) {
      return NextResponse.json(
        { error: `Explique por que não há controles (pelo menos ${JUSTIFICATIVA_MINIMA} caracteres).` },
        { status: 400 }
      );
    }
    const sql = sqlAuditado(guarda.usuario);
    const [r] = await sql`
      SELECT status, (SELECT COUNT(*) FROM fatores_risco f WHERE f.risco_id = riscos.id)::int AS fatores
      FROM riscos WHERE id = ${id}
    `;
    if (!r) return NextResponse.json({ error: "Risco não encontrado." }, { status: 404 });
    if (r.status === "Mitigado") return NextResponse.json({ error: "Risco mitigado não pode ser alterado." }, { status: 409 });
    if (r.fatores > 0) {
      return NextResponse.json({ error: "Este risco já tem controles cadastrados." }, { status: 409 });
    }
    await sql`
      UPDATE riscos SET sem_controles = true, sem_controles_justificativa = ${justificativa},
                        sem_controles_por_email = ${guarda.usuario.email}, sem_controles_em = now()
      WHERE id = ${id}
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao registrar a declaração." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  const { id } = await props.params;
  try {
    if (!/^\d+$/.test(id ?? "")) return NextResponse.json({ error: "ID de risco inválido." }, { status: 400 });
    const sql = sqlAuditado(guarda.usuario);
    await sql`
      UPDATE riscos SET sem_controles = false, sem_controles_justificativa = NULL,
                        sem_controles_por_email = NULL, sem_controles_em = NULL
      WHERE id = ${id}
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao desfazer a declaração." }, { status: 500 });
  }
}
