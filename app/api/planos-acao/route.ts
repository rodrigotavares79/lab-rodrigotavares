import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const STATUS_VALIDOS = ["Não iniciado", "Em andamento", "Concluído"];

export async function GET(request: NextRequest) {
  try {
    const riscoId = request.nextUrl.searchParams.get("riscoId");
    if (!riscoId || !/^\d+$/.test(riscoId)) {
      return NextResponse.json({ error: "riscoId é obrigatório e deve ser numérico." }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`
      SELECT id, risco_id, descricao, responsavel, prazo, status, criado_em
      FROM planos_acao
      WHERE risco_id = ${riscoId}
      ORDER BY criado_em DESC
    `;

    return NextResponse.json({ planos: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar planos de ação." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { riscoId, descricao, responsavel, prazo } = body ?? {};

    if (!riscoId) {
      return NextResponse.json({ error: "riscoId é obrigatório." }, { status: 400 });
    }
    if (!descricao || typeof descricao !== "string" || !descricao.trim()) {
      return NextResponse.json({ error: "Descrição do plano de ação é obrigatória." }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    const riscoRows = await sql`SELECT id FROM riscos WHERE id = ${riscoId}`;
    if (riscoRows.length === 0) {
      return NextResponse.json({ error: "Risco não encontrado." }, { status: 404 });
    }

    const rows = await sql`
      INSERT INTO planos_acao (risco_id, descricao, responsavel, prazo, status)
      VALUES (${riscoId}, ${descricao.trim()}, ${responsavel || null}, ${prazo || null}, ${STATUS_VALIDOS[0]})
      RETURNING id, risco_id, descricao, responsavel, prazo, status, criado_em
    `;

    return NextResponse.json({ plano: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno ao cadastrar o plano de ação." }, { status: 500 });
  }
}
