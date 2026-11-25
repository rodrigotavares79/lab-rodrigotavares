import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { obterIndicadores } from "@/lib/indicadoresRiscos";

// Dados resumidos da página inicial do Gestão de Riscos. Os indicadores vêm
// de lib/indicadoresRiscos (fonte única); aqui só se monta a lista de
// riscos críticos e altos ativos que pedem atenção.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });

    const ind = await obterIndicadores(sql);

    const atencao = await sql`
      SELECT
        r.id, r.gatilho, r.categoria, r.impacto_qualitativo,
        MIN(a.prazo) FILTER (WHERE a.status IS DISTINCT FROM 'Concluído') AS proximo_prazo
      FROM riscos r
      LEFT JOIN planos_acao pa ON pa.risco_id = r.id
      LEFT JOIN acoes a ON a.plano_acao_id = pa.id
      WHERE r.status <> 'Mitigado'
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

    return NextResponse.json({
      categorias: ind.categorias.slice(0, 3),
      niveis: ind.niveis,
      trimestres: ind.trimestres,
      kpis: {
        total: ind.kpis.total,
        ativos: ind.kpis.ativos,
        criticos: ind.kpis.criticos,
        altos: ind.kpis.altos,
        planosAbertos: ind.kpis.planosAbertos,
        acoesTotal: ind.kpis.acoesTotal,
        acoesConcluidas: ind.kpis.acoesConcluidas,
        acoesAtrasadas: ind.kpis.acoesAtrasadas,
      },
      matriz: ind.matriz,
      atencao,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar o resumo de riscos." }, { status: 500 });
  }
}
