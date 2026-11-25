import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { obterIndicadores } from "@/lib/indicadoresRiscos";

// Dados do Dashboard. Os indicadores vêm de lib/indicadoresRiscos (fonte
// única, mesmas definições do Início e do Relatório Executivo).
export async function GET(request: NextRequest) {
  try {
    const projetoParam = request.nextUrl.searchParams.get("projetoId");
    if (projetoParam && !/^\d+$/.test(projetoParam)) {
      return NextResponse.json({ error: "projetoId deve ser numérico." }, { status: 400 });
    }
    const projetoId = projetoParam ? Number(projetoParam) : null;
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });

    const ind = await obterIndicadores(sql, projetoId);

    // Riscos por mês (B05): pela data de LEVANTAMENTO (quando o risco foi
    // identificado) e pela data de CADASTRO no sistema, numa sequência
    // contínua de meses (meses sem riscos aparecem com zero), do mês mais
    // antigo até o mês atual. Riscos sem data de levantamento entram só na
    // série de cadastro e são contados à parte.
    const evolucao = await sql`
      WITH base AS (
        SELECT
          date_trunc('month', NULLIF(data_levantamento::text, '')::date) AS mes_lev,
          date_trunc('month', criado_em AT TIME ZONE 'America/Sao_Paulo') AS mes_cad
        FROM riscos
        WHERE (${projetoId}::int IS NULL OR projeto_id = ${projetoId}::int)
      ),
      meses AS (
        SELECT generate_series(
          LEAST((SELECT MIN(mes_lev) FROM base), (SELECT MIN(mes_cad) FROM base)),
          date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo'),
          interval '1 month'
        ) AS mes
      )
      SELECT
        to_char(m.mes, 'YYYY-MM') AS mes,
        (SELECT COUNT(*) FROM base WHERE mes_lev = m.mes)::int AS levantamento,
        (SELECT COUNT(*) FROM base WHERE mes_cad = m.mes)::int AS cadastro
      FROM meses m
      ORDER BY m.mes
    `;
    const [{ sem_data: semDataLevantamento }] = await sql`
      SELECT COUNT(*)::int AS sem_data
      FROM riscos
      WHERE NULLIF(data_levantamento::text, '') IS NULL
        AND (${projetoId}::int IS NULL OR projeto_id = ${projetoId}::int)
    `;

    return NextResponse.json({
      kpis: {
        total: ind.kpis.total,
        mitigados: ind.kpis.mitigados,
        criticos_abertos: ind.kpis.criticos,
        em_aberto: ind.kpis.ativos,
      },
      niveis: ind.niveis,
      niveisIniciais: ind.niveisIniciais,
      niveisAtuaisTodos: ind.niveisAtuaisTodos,
      mitigacao: ind.inerenteXAtual,
      categorias: ind.categorias,
      evolucao,
      semDataLevantamento,
      consolidado: ind.porProjeto.map((p) => ({ projeto: p.projeto, total: p.total, criticos: p.criticos })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar dados do dashboard." }, { status: 500 });
  }
}
