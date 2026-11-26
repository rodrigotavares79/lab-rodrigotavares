import { exigirPermissao } from "@/lib/riscosAuth";
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { obterIndicadores } from "@/lib/indicadoresRiscos";

// Dados resumidos da página inicial do Gestão de Riscos. Os indicadores vêm
// de lib/indicadoresRiscos (fonte única); aqui só se monta a lista de
// riscos críticos e altos ativos que pedem atenção.
export const dynamic = "force-dynamic";

export async function GET() {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });

    const ind = await obterIndicadores(sql);

    const atencao = await sql`
      SELECT
        r.id, r.gatilho, r.titulo, r.categoria, r.impacto_qualitativo, r.status,
        to_char(MIN(NULLIF(a.prazo::text, '')::date) FILTER (
          WHERE a.status IS DISTINCT FROM 'Concluído' AND pa.status IS DISTINCT FROM 'Concluído'
        ), 'YYYY-MM-DD') AS proximo_prazo,
        COUNT(DISTINCT pa.id) FILTER (WHERE pa.status IS DISTINCT FROM 'Concluído')::int AS planos_abertos
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
        -- B25: dentro do nível, primeiro quem está sem plano (e não aceito).
        (r.status <> 'Aceito' AND COUNT(DISTINCT pa.id) FILTER (WHERE pa.status IS DISTINCT FROM 'Concluído') = 0) DESC,
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
        revisoesVencidas: ind.kpis.revisoesVencidas,
        semTratamento: ind.kpis.semTratamento,
        altoCriticoComTratamento: ind.kpis.altoCriticoComTratamento,
        altoCriticoTotal: ind.kpis.altoCriticoTotal,
      },
      matriz: ind.matriz,
      atencao,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar o resumo de riscos." }, { status: 500 });
  }
}
