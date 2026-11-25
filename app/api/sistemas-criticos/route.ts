import { exigirPermissao } from "@/lib/riscosAuth";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET(request: NextRequest) {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  try {
    const projetoId = request.nextUrl.searchParams.get("projetoId");
    if (!projetoId) {
      return NextResponse.json({ error: "projetoId é obrigatório." }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const rows = await sql`
      SELECT id, nome, tipo, area_responsavel, custo_indisponibilidade_hora, custo_restauracao_hora_homem
      FROM sistemas_criticos
      WHERE projeto_id = ${projetoId} AND ativo
      ORDER BY nome ASC
    `;
    return NextResponse.json({ sistemas: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar sistemas críticos." }, { status: 500 });
  }
}
