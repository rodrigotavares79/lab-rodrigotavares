import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// POST: cria uma nova Ação dentro de um Plano de Ação já existente.
// Bloqueado se:
// - o Plano de Ação já estiver "Concluído" (não se cria ação nova nele), ou
// - o risco dono do plano já estiver "Mitigado" (tudo congela).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planoAcaoId, descricao, responsavel, prazo } = body ?? {};

    if (!planoAcaoId) {
      return NextResponse.json({ error: "planoAcaoId é obrigatório." }, { status: 400 });
    }
    if (!descricao || typeof descricao !== "string" || !descricao.trim()) {
      return NextResponse.json({ error: "Descrição da ação é obrigatória." }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    const planoRows = await sql`
      SELECT pa.id, pa.status AS plano_status, r.status AS risco_status
      FROM planos_acao pa
      JOIN riscos r ON r.id = pa.risco_id
      WHERE pa.id = ${planoAcaoId}
    `;
    if (planoRows.length === 0) {
      return NextResponse.json({ error: "Plano de ação não encontrado." }, { status: 404 });
    }
    const plano = planoRows[0];

    if (plano.risco_status === "Mitigado") {
      return NextResponse.json(
        { error: "O risco deste plano já foi mitigado. Nada pode mais ser cadastrado." },
        { status: 409 }
      );
    }
    if (plano.plano_status === "Concluído") {
      return NextResponse.json(
        { error: "Este plano de ação já foi concluído. Não é possível cadastrar novas ações nele." },
        { status: 409 }
      );
    }

    const rows = await sql`
      INSERT INTO acoes (plano_acao_id, descricao, responsavel, prazo, status)
      VALUES (${planoAcaoId}, ${descricao.trim()}, ${responsavel || null}, ${prazo || null}, 'Não iniciado')
      RETURNING id, plano_acao_id, descricao, responsavel, prazo, status, criado_em
    `;

    return NextResponse.json({ acao: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno ao cadastrar a ação." }, { status: 500 });
  }
}
