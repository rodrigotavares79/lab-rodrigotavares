import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET(request: NextRequest) {
  try {
    const projetoId = request.nextUrl.searchParams.get("projetoId");
    const sql = neon(process.env.DATABASE_URL!);

    const kpisRows = projetoId
      ? await sql`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'Resolvido')::int AS mitigados,
            COUNT(*) FILTER (WHERE impacto_qualitativo = 'Crítico' AND status != 'Resolvido')::int AS criticos_abertos,
            COUNT(*) FILTER (WHERE status = 'Identificado')::int AS em_aberto,
            COALESCE(SUM(impacto_critico_total), 0)::float AS exposicao_critica,
            COALESCE(SUM(impacto_alto_total), 0)::float AS exposicao_alta
          FROM riscos WHERE projeto_id = ${projetoId}
        `
      : await sql`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'Resolvido')::int AS mitigados,
            COUNT(*) FILTER (WHERE impacto_qualitativo = 'Crítico' AND status != 'Resolvido')::int AS criticos_abertos,
            COUNT(*) FILTER (WHERE status = 'Identificado')::int AS em_aberto,
            COALESCE(SUM(impacto_critico_total), 0)::float AS exposicao_critica,
            COALESCE(SUM(impacto_alto_total), 0)::float AS exposicao_alta
          FROM riscos
        `;

    const niveis = projetoId
      ? await sql`
          SELECT impacto_qualitativo AS nivel, COUNT(*)::int AS total
          FROM riscos WHERE impacto_qualitativo IS NOT NULL AND projeto_id = ${projetoId}
          GROUP BY impacto_qualitativo
        `
      : await sql`
          SELECT impacto_qualitativo AS nivel, COUNT(*)::int AS total
          FROM riscos WHERE impacto_qualitativo IS NOT NULL
          GROUP BY impacto_qualitativo
        `;

    const categorias = projetoId
      ? await sql`
          SELECT categoria, COUNT(*)::int AS total
          FROM riscos WHERE categoria IS NOT NULL AND projeto_id = ${projetoId}
          GROUP BY categoria ORDER BY total DESC
        `
      : await sql`
          SELECT categoria, COUNT(*)::int AS total
          FROM riscos WHERE categoria IS NOT NULL
          GROUP BY categoria ORDER BY total DESC
        `;

    const evolucao = projetoId
      ? await sql`
          SELECT to_char(date_trunc('month', criado_em), 'YYYY-MM') AS mes, COUNT(*)::int AS total
          FROM riscos WHERE projeto_id = ${projetoId}
          GROUP BY 1 ORDER BY 1
        `
      : await sql`
          SELECT to_char(date_trunc('month', criado_em), 'YYYY-MM') AS mes, COUNT(*)::int AS total
          FROM riscos
          GROUP BY 1 ORDER BY 1
        `;

    const ranking = projetoId
      ? await sql`
          SELECT r.id, p.nome AS projeto, r.categoria, r.gatilho,
                 COALESCE(r.impacto_critico_total,0)::float AS impacto_critico_total,
                 COALESCE(r.impacto_alto_total,0)::float AS impacto_alto_total
          FROM riscos r JOIN projetos p ON p.id = r.projeto_id
          WHERE r.impacto_critico_total IS NOT NULL AND r.projeto_id = ${projetoId}
          ORDER BY r.impacto_critico_total DESC LIMIT 10
        `
      : await sql`
          SELECT r.id, p.nome AS projeto, r.categoria, r.gatilho,
                 COALESCE(r.impacto_critico_total,0)::float AS impacto_critico_total,
                 COALESCE(r.impacto_alto_total,0)::float AS impacto_alto_total
          FROM riscos r JOIN projetos p ON p.id = r.projeto_id
          WHERE r.impacto_critico_total IS NOT NULL
          ORDER BY r.impacto_critico_total DESC LIMIT 10
        `;

    const consolidado = await sql`
      SELECT p.nome AS projeto, COUNT(r.id)::int AS total,
             COUNT(r.id) FILTER (WHERE r.impacto_qualitativo = 'Crítico')::int AS criticos,
             COALESCE(SUM(r.impacto_critico_total), 0)::float AS exposicao
      FROM projetos p LEFT JOIN riscos r ON r.projeto_id = p.id
      GROUP BY p.nome ORDER BY p.nome
    `;

    return NextResponse.json({
      kpis: kpisRows[0],
      niveis,
      categorias,
      evolucao,
      ranking,
      consolidado,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar dados do dashboard." }, { status: 500 });
  }
}
