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
        COUNT(*) FILTER (WHERE status IS DISTINCT FROM 'Mitigado' AND impacto_qualitativo = 'Alto')::int AS altos,
        COUNT(*) FILTER (WHERE status IS DISTINCT FROM 'Mitigado' AND impacto_qualitativo = 'Significativo')::int AS significativos
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
        AND r.impacto_qualitativo IN ('Alto', 'Significativo')
      GROUP BY r.id
      ORDER BY
        CASE r.impacto_qualitativo
          WHEN 'Alto' THEN 4 WHEN 'Significativo' THEN 3
          WHEN 'Moderado' THEN 2 WHEN 'Baixo' THEN 1 ELSE 0 END DESC,
        r.matrix_score DESC NULLS LAST,
        r.id DESC
      LIMIT 5
    `;

    return NextResponse.json({
      kpis: {
        total: riscosKpi.total,
        ativos: riscosKpi.ativos,
        altos: riscosKpi.altos,
        significativos: riscosKpi.significativos,
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
