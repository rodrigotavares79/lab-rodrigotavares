import { NextRequest, NextResponse } from "next/server";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { exigirPermissao } from "@/lib/riscosAuth";

export const dynamic = "force-dynamic";

const STATUS_VALIDOS = ["Aberto", "Concluído"];

// PATCH: atualiza título e/ou status do Plano de Ação.
// - Bloqueado por completo se o risco já estiver Mitigado (tudo congela).
// - Concluir o plano (status "Concluído") só é permitido se todas as ações
//   dentro dele já estiverem "Concluído" (e houver pelo menos uma) e se houver
//   pelo menos uma evidência anexada. O plano concluído entra na fila da
//   Auditoria ("Pendente").
// - Plano auditado como "Conforme" não pode mais ser alterado. Reabrir um
//   plano Pendente o tira da fila da Auditoria.
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("editarPlanos");
  if (guarda.resposta) return guarda.resposta;
  const params = await props.params;
  try {
    const { id } = params;
    if (!id || !/^\d+$/.test(id)) {
      return NextResponse.json({ error: "ID de plano de ação inválido." }, { status: 400 });
    }

    const body = await request.json();
    const { status, titulo } = body ?? {};

    if (status !== undefined && !STATUS_VALIDOS.includes(status)) {
      return NextResponse.json(
        { error: `Status inválido. Use um de: ${STATUS_VALIDOS.join(", ")}.` },
        { status: 400 }
      );
    }

    const sql = sqlAuditado(guarda.usuario);

    const atualRows = await sql`
      SELECT pa.titulo, pa.status, pa.auditoria_status, r.status AS risco_status
      FROM planos_acao pa
      JOIN riscos r ON r.id = pa.risco_id
      WHERE pa.id = ${id}
    `;
    if (atualRows.length === 0) {
      return NextResponse.json({ error: "Plano de ação não encontrado." }, { status: 404 });
    }
    const atual = atualRows[0];

    if (atual.risco_status === "Mitigado") {
      return NextResponse.json(
        { error: "O risco deste plano já foi mitigado. Nada pode mais ser alterado." },
        { status: 409 }
      );
    }

    if (atual.auditoria_status === "Conforme") {
      return NextResponse.json(
        { error: "Este plano já foi auditado como Conforme e não pode mais ser alterado." },
        { status: 409 }
      );
    }

    const concluindo = status === "Concluído" && atual.status !== "Concluído";
    const reabrindo = status === "Aberto" && atual.status === "Concluído";

    if (concluindo) {
      const evidRows = await sql`
        SELECT COUNT(*)::int AS total FROM planos_acao_evidencias WHERE plano_acao_id = ${id}
      `;
      if (evidRows[0].total === 0) {
        return NextResponse.json(
          { error: "Anexe pelo menos uma evidência antes de concluir o plano — ela será validada pela Auditoria." },
          { status: 400 }
        );
      }
    }

    if (concluindo) {
      const pendentesRows = await sql`
        SELECT COUNT(*)::int AS total FROM acoes
        WHERE plano_acao_id = ${id} AND status != 'Concluído'
      `;
      const totalRows = await sql`SELECT COUNT(*)::int AS total FROM acoes WHERE plano_acao_id = ${id}`;
      if (totalRows[0].total === 0) {
        return NextResponse.json(
          { error: "Cadastre pelo menos uma ação antes de concluir o plano." },
          { status: 400 }
        );
      }
      if (pendentesRows[0].total > 0) {
        return NextResponse.json(
          { error: "Todas as ações precisam estar concluídas antes de concluir o plano." },
          { status: 400 }
        );
      }
    }

    const rows = await sql`
      UPDATE planos_acao
      SET titulo = ${titulo ?? atual.titulo},
          status = ${status ?? atual.status},
          concluido_em = CASE
            WHEN ${concluindo}::boolean THEN now()
            WHEN ${reabrindo}::boolean THEN NULL
            ELSE concluido_em END,
          auditoria_status = CASE
            WHEN ${concluindo}::boolean THEN 'Pendente'
            WHEN ${reabrindo}::boolean THEN NULL
            ELSE auditoria_status END
      WHERE id = ${id}
      RETURNING id, risco_id, titulo, status, criado_em, concluido_em, auditoria_status
    `;

    return NextResponse.json({ plano: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno ao atualizar o plano de ação." }, { status: 500 });
  }
}
