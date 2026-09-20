import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET(request: NextRequest) {
  try {
    const projetoId = request.nextUrl.searchParams.get("projetoId");
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });

    const rows = projetoId
      ? await sql`
          SELECT
            r.id, p.nome AS projeto, r.categoria, r.gatilho, r.levantado_por,
            r.data_levantamento, r.impacto_qualitativo, r.matrix_score,
            r.status, r.criado_em
          FROM riscos r
          JOIN projetos p ON p.id = r.projeto_id
          WHERE r.projeto_id = ${projetoId}
          ORDER BY r.criado_em DESC
        `
      : await sql`
          SELECT
            r.id, p.nome AS projeto, r.categoria, r.gatilho, r.levantado_por,
            r.data_levantamento, r.impacto_qualitativo, r.matrix_score,
            r.status, r.criado_em
          FROM riscos r
          JOIN projetos p ON p.id = r.projeto_id
          ORDER BY r.criado_em DESC
        `;

    return NextResponse.json({ riscos: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar riscos." }, { status: 500 });
  }
}
