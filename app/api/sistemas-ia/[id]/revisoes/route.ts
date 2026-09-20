import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id || !/^\d+$/.test(id)) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    const data = await request.json();
    const { revisadoPor, dataRevisao, numeroChamado, parecerAprovado } = data ?? {};

    if (!dataRevisao || typeof dataRevisao !== "string") {
      return NextResponse.json({ error: "Data da revisão é obrigatória." }, { status: 400 });
    }
    if (parecerAprovado !== true && parecerAprovado !== false) {
      return NextResponse.json({ error: "Parecer (Sim/Não) é obrigatório." }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    const sistemaRows = await sql`SELECT id FROM sistemas_ia WHERE id = ${id}`;
    if (sistemaRows.length === 0) {
      return NextResponse.json({ error: "Sistema não encontrado." }, { status: 404 });
    }

    const rows = await sql`
      INSERT INTO revisoes_sistemas_ia (
        sistema_ia_id, revisado_por, data_revisao, numero_chamado, parecer_aprovado
      ) VALUES (
        ${id}, ${revisadoPor || null}, ${dataRevisao}, ${numeroChamado || null}, ${parecerAprovado}
      )
      RETURNING id
    `;

    return NextResponse.json({ ok: true, id: rows[0].id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao registrar revisão." }, { status: 500 });
  }
}
