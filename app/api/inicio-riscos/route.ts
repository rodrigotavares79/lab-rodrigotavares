import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// Dados resumidos da página inicial do Gestão de Riscos: KPIs, contagem por
// célula da matriz 5×5 (nível atual) e os riscos críticos e altos ativos.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });

    const [riscosKpi] = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status IS DISTINCT FROM 'Mitigado')::int AS ativos,
        COUNT(*) FILTER (WHERE status IS DISTINCT FROM 'Mitigado' AND impacto_qualitativo = 'Crítico')::int AS criticos,
        COUNT(*) FILTER (WHERE status IS DISTINCT FROM 'Mitigado' AND impacto_qualitativo = 'Alto')::int AS altos
      FROM riscos
    `;

    const [planosKpi] = await sql`
      SELECT COUNT(*) FILTER (WHERE status IS DISTINCT FROM 'Concluído')::int AS abertos
      FROM planos_acao
    `;

    const [acoesKpi] = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'Concluído')::int AS concluidas,
        COUNT(*) FILTER (WHERE status IS DISTINCT FROM 'Concluído' AND NULLIF(prazo::text, '')::date < CURRENT_DATE)::int AS atrasadas
      FROM acoes
    `;

    // Posição atual na matriz (após controles); cai para o inerente quando
    // o risco ainda não tem nível atual calculado.
    const matriz = await sql`
      SELECT
        COALESCE(prob_nivel_atual, probabilidade)::int AS prob,
        COALESCE(imp_nivel_atual, impacto)::int AS imp,
        COUNT(*)::int AS total
      FROM riscos
      WHERE status IS DISTINCT FROM 'Mitigado'
        AND COALESCE(prob_nivel_atual, probabilidade) IS NOT NULL
        AND COALESCE(imp_nivel_atual, impacto) IS NOT NULL
      GROUP BY 1, 2
    `;

    const atencao = await sql`
      SELECT
        r.id, r.gatilho, r.categoria, r.impacto_qualitativo,
        MIN(a.prazo) FILTER (WHERE a.status IS DISTINCT FROM 'Concluído') AS proximo_prazo
      FROM riscos r
      LEFT JOIN planos_acao pa ON pa.risco_id = r.id
      LEFT JOIN acoes a ON a.plano_acao_id = pa.id
      WHERE r.status IS DISTINCT FROM 'Mitigado'
        AND r.impacto_qualitativo IN ('Crítico', 'Alto')
      GROUP BY r.id
      ORDER BY
        CASE r.impacto_qualitativo
          WHEN 'Crítico' THEN 4 WHEN 'Alto' THEN 3
          WHEN 'Médio' THEN 2 WHEN 'Baixo' THEN 1 ELSE 0 END DESC,
        r.matrix_score DESC NULLS LAST,
        r.id DESC
      LIMIT 5
    `;

    // Top 3 categorias entre os riscos ativos.
    const categorias = await sql`
      SELECT categoria, COUNT(*)::int AS total
      FROM riscos
      WHERE status IS DISTINCT FROM 'Mitigado' AND categoria IS NOT NULL
      GROUP BY categoria
      ORDER BY total DESC, categoria
      LIMIT 3
    `;

    // Riscos ativos por nível atual (criticidade).
    const niveis = await sql`
      SELECT impacto_qualitativo AS nivel, COUNT(*)::int AS total
      FROM riscos
      WHERE status IS DISTINCT FROM 'Mitigado' AND impacto_qualitativo IS NOT NULL
      GROUP BY impacto_qualitativo
    `;

    // Mitigação trimestral (gauge): por trimestre do ano corrente, quantos
    // riscos Críticos/Altos em aberto no período foram mitigados nele.
    // Base = riscos desse nível criados até o fim do trimestre e ainda não
    // mitigados no início dele. Mitigados sem data (antes da coluna
    // mitigado_em existir) ficam fora da conta.
    const trimestres = await sql`
      WITH q AS (
        SELECT generate_series(
          date_trunc('year', now()),
          date_trunc('quarter', now()),
          interval '3 months'
        ) AS ini
      )
      SELECT
        EXTRACT(quarter FROM q.ini)::int AS trimestre,
        COUNT(r.id)::int AS total,
        COUNT(r.id) FILTER (
          WHERE r.mitigado_em >= q.ini AND r.mitigado_em < q.ini + interval '3 months'
        )::int AS mitigados
      FROM q
      LEFT JOIN riscos r
        ON (r.nivel_inicial IN ('Crítico', 'Alto') OR r.impacto_qualitativo IN ('Crítico', 'Alto'))
       AND r.criado_em < q.ini + interval '3 months'
       AND (r.status IS DISTINCT FROM 'Mitigado' OR r.mitigado_em >= q.ini)
      GROUP BY q.ini
      ORDER BY q.ini
    `;

    return NextResponse.json({
      categorias,
      niveis,
      trimestres,
      kpis: {
        total: riscosKpi.total,
        ativos: riscosKpi.ativos,
        criticos: riscosKpi.criticos,
        altos: riscosKpi.altos,
        planosAbertos: planosKpi.abertos,
        acoesTotal: acoesKpi.total,
        acoesConcluidas: acoesKpi.concluidas,
        acoesAtrasadas: acoesKpi.atrasadas,
      },
      matriz,
      atencao,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar o resumo de riscos." }, { status: 500 });
  }
}
