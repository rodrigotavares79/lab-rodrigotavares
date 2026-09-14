import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// GET: lista os Planos de Ação (container) de um risco, cada um já com a
// lista de Ações que tem dentro dele.
export async function GET(request: NextRequest) {
  try {
    const riscoId = request.nextUrl.searchParams.get("riscoId");
    if (!riscoId || !/^\d+$/.test(riscoId)) {
      return NextResponse.json({ error: "riscoId é obrigatório e deve ser numérico." }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    const planos = await sql`
      SELECT id, risco_id, titulo, status, criado_em
      FROM planos_acao
      WHERE risco_id = ${riscoId}
      ORDER BY criado_em DESC
    `;

    if (planos.length === 0) {
      return NextResponse.json({ planos: [] });
    }

    const planoIds = planos.map((p: any) => p.id);
    const acoes = await sql`
      SELECT id, plano_acao_id, descricao, responsavel, prazo, status, criado_em
      FROM acoes
      WHERE plano_acao_id = ANY(${planoIds})
      ORDER BY criado_em ASC
    `;

    const acoesPorPlano = new Map<number, any[]>();
    for (const a of acoes) {
      const lista = acoesPorPlano.get(a.plano_acao_id) || [];
      lista.push(a);
      acoesPorPlano.set(a.plano_acao_id, lista);
    }

    const planosComAcoes = planos.map((p: any) => ({
      ...p,
      acoes: acoesPorPlano.get(p.id) || [],
    }));

    return NextResponse.json({ planos: planosComAcoes });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar planos de ação." }, { status: 500 });
  }
}

// POST: cria um novo Plano de Ação (container) para um risco. Bloqueado se o
// risco já estiver Mitigado — nesse estado, nada mais pode ser cadastrado.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { riscoId, titulo } = body ?? {};

    if (!riscoId) {
      return NextResponse.json({ error: "riscoId é obrigatório." }, { status: 400 });
    }
    if (!titulo || typeof titulo !== "string" || !titulo.trim()) {
      return NextResponse.json({ error: "Título do plano de ação é obrigatório." }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    const riscoRows = await sql`SELECT id, status FROM riscos WHERE id = ${riscoId}`;
    if (riscoRows.length === 0) {
      return NextResponse.json({ error: "Risco não encontrado." }, { status: 404 });
    }
    if (riscoRows[0].status === "Mitigado") {
      return NextResponse.json(
        { error: "Este risco já foi mitigado. Não é possível cadastrar novo plano de ação." },
        { status: 409 }
      );
    }

    const rows = await sql`
      INSERT INTO planos_acao (risco_id, titulo, status)
      VALUES (${riscoId}, ${titulo.trim()}, 'Aberto')
      RETURNING id, risco_id, titulo, status, criado_em
    `;

    return NextResponse.json({ plano: { ...rows[0], acoes: [] } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno ao cadastrar o plano de ação." }, { status: 500 });
  }
}
