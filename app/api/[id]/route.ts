import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const STATUS_VALIDOS = ["Não iniciado", "Em andamento", "Concluído"];

// PATCH: atualiza uma Ação (status, descrição, responsável, prazo).
// Bloqueado por completo se o risco dono do plano já estiver "Mitigado".
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id || !/^\d+$/.test(id)) {
      return NextResponse.json({ error: "ID de ação inválido." }, { status: 400 });
    }

    const body = await request.json();
    const { status, descricao, responsavel, prazo } = body ?? {};

    if (status !== undefined && !STATUS_VALIDOS.includes(status)) {
      return NextResponse.json(
        { error: `Status inválido. Use um de: ${STATUS_VALIDOS.join(", ")}.` },
        { status: 400 }
      );
    }

    const sql = neon(process.env.DATABASE_URL!);

    const atualRows = await sql`
      SELECT a.descricao, a.responsavel, a.prazo, a.status, r.status AS risco_status
      FROM acoes a
      JOIN planos_acao pa ON pa.id = a.plano_acao_id
      JOIN riscos r ON r.id = pa.risco_id
      WHERE a.id = ${id}
    `;
    if (atualRows.length === 0) {
      return NextResponse.json({ error: "Ação não encontrada." }, { status: 404 });
    }
    const atual = atualRows[0];

    if (atual.risco_status === "Mitigado") {
      return NextResponse.json(
        { error: "O risco desta ação já foi mitigado. Nada pode mais ser alterado." },
        { status: 409 }
      );
    }

    const rows = await sql`
      UPDATE acoes
      SET descricao = ${descricao ?? atual.descricao},
          responsavel = ${responsavel !== undefined ? responsavel : atual.responsavel},
          prazo = ${prazo !== undefined ? prazo : atual.prazo},
          status = ${status ?? atual.status}
      WHERE id = ${id}
      RETURNING id, plano_acao_id, descricao, responsavel, prazo, status, criado_em
    `;

    return NextResponse.json({ acao: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno ao atualizar a ação." }, { status: 500 });
  }
}
