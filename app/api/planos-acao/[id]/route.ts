import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const STATUS_VALIDOS = ["Não iniciado", "Em andamento", "Concluído"];

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id || !/^\d+$/.test(id)) {
      return NextResponse.json({ error: "ID de plano de ação inválido." }, { status: 400 });
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

    const atualRows = await sql`SELECT descricao, responsavel, prazo, status FROM planos_acao WHERE id = ${id}`;
    if (atualRows.length === 0) {
      return NextResponse.json({ error: "Plano de ação não encontrado." }, { status: 404 });
    }
    const atual = atualRows[0];

    const rows = await sql`
      UPDATE planos_acao
      SET descricao = ${descricao ?? atual.descricao},
          responsavel = ${responsavel !== undefined ? responsavel : atual.responsavel},
          prazo = ${prazo !== undefined ? prazo : atual.prazo},
          status = ${status ?? atual.status}
      WHERE id = ${id}
      RETURNING id, risco_id, descricao, responsavel, prazo, status, criado_em
    `;

    return NextResponse.json({ plano: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno ao atualizar o plano de ação." }, { status: 500 });
  }
}
