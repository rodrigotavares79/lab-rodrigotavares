import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

const STATUS_VALIDOS = ["Aberto", "Concluído"];

// PATCH: atualiza título e/ou status do Plano de Ação.
// - Bloqueado por completo se o risco já estiver Mitigado (tudo congela).
// - Concluir o plano (status "Concluído") só é permitido se todas as ações
//   dentro dele já estiverem "Concluído" (e houver pelo menos uma).
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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

    const sql = neon(process.env.DATABASE_URL!);

    const atualRows = await sql`
      SELECT pa.titulo, pa.status, r.status AS risco_status
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

    if (status === "Concluído" && atual.status !== "Concluído") {
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
          status = ${status ?? atual.status}
      WHERE id = ${id}
      RETURNING id, risco_id, titulo, status, criado_em
    `;

    return NextResponse.json({ plano: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno ao atualizar o plano de ação." }, { status: 500 });
  }
}
