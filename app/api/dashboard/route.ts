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
            COUNT(*) FILTER (WHERE status = 'Mitigado')::int AS mitigados,
            COUNT(*) FILTER (WHERE impacto_qualitativo = 'Alto' AND status != 'Mitigado')::int AS criticos_abertos,
            COUNT(*) FILTER (WHERE status = 'Identificado')::int AS em_aberto,
            COALESCE(SUM(impacto_critico_total), 0)::float AS exposicao_critica,
            COALESCE(SUM(impacto_alto_total), 0)::float AS exposicao_alta
          FROM riscos WHERE projeto_id = ${projetoId}
        `
      : await sql`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'Mitigado')::int AS mitigados,
            COUNT(*) FILTER (WHERE impacto_qualitativo = 'Alto' AND status != 'Mitigado')::int AS criticos_abertos,
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

    // Mesma distribuição, mas pelo NÍVEL INICIAL (o que foi calculado na
    // criação do risco, antes de qualquer mitigação) — para comparar lado a
    // lado com a distribuição atual no gráfico "Nível Inicial x Atual".
    const niveisIniciais = projetoId
      ? await sql`
          SELECT nivel_inicial AS nivel, COUNT(*)::int AS total
          FROM riscos WHERE nivel_inicial IS NOT NULL AND projeto_id = ${projetoId}
          GROUP BY nivel_inicial
        `
      : await sql`
          SELECT nivel_inicial AS nivel, COUNT(*)::int AS total
          FROM riscos WHERE nivel_inicial IS NOT NULL
          GROUP BY nivel_inicial
        `;

    // Compara nível inicial x nível atual, risco a risco, convertendo cada
    // nível em um rank numérico (Baixo=1 ... Alto=4) para saber se o risco
    // melhorou, se manteve ou piorou desde que foi criado.
    const mitigacaoRows = projetoId
      ? await sql`
          SELECT
            COUNT(*) FILTER (WHERE rank_atual < rank_inicial)::int AS melhorou,
            COUNT(*) FILTER (WHERE rank_atual = rank_inicial)::int AS manteve,
            COUNT(*) FILTER (WHERE rank_atual > rank_inicial)::int AS piorou
          FROM (
            SELECT
              CASE nivel_inicial WHEN 'Baixo' THEN 1 WHEN 'Moderado' THEN 2 WHEN 'Significativo' THEN 3 WHEN 'Alto' THEN 4 END AS rank_inicial,
              CASE impacto_qualitativo WHEN 'Baixo' THEN 1 WHEN 'Moderado' THEN 2 WHEN 'Significativo' THEN 3 WHEN 'Alto' THEN 4 END AS rank_atual
            FROM riscos
            WHERE projeto_id = ${projetoId} AND nivel_inicial IS NOT NULL AND impacto_qualitativo IS NOT NULL
          ) t
        `
      : await sql`
          SELECT
            COUNT(*) FILTER (WHERE rank_atual < rank_inicial)::int AS melhorou,
            COUNT(*) FILTER (WHERE rank_atual = rank_inicial)::int AS manteve,
            COUNT(*) FILTER (WHERE rank_atual > rank_inicial)::int AS piorou
          FROM (
            SELECT
              CASE nivel_inicial WHEN 'Baixo' THEN 1 WHEN 'Moderado' THEN 2 WHEN 'Significativo' THEN 3 WHEN 'Alto' THEN 4 END AS rank_inicial,
              CASE impacto_qualitativo WHEN 'Baixo' THEN 1 WHEN 'Moderado' THEN 2 WHEN 'Significativo' THEN 3 WHEN 'Alto' THEN 4 END AS rank_atual
            FROM riscos
            WHERE nivel_inicial IS NOT NULL AND impacto_qualitativo IS NOT NULL
          ) t
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
             COUNT(r.id) FILTER (WHERE r.impacto_qualitativo = 'Alto')::int AS criticos,
             COALESCE(SUM(r.impacto_critico_total), 0)::float AS exposicao
      FROM projetos p LEFT JOIN riscos r ON r.projeto_id = p.id
      GROUP BY p.nome ORDER BY p.nome
    `;

    return NextResponse.json({
      kpis: kpisRows[0],
      niveis,
      niveisIniciais,
      mitigacao: mitigacaoRows[0],
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
