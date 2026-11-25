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

    // Riscos cadastrados por mês (data de cadastro). Ajuste para data de
    // levantamento previsto no item B05 do backlog.
    const evolucao = await sql`
      SELECT to_char(date_trunc('month', criado_em), 'YYYY-MM') AS mes, COUNT(*)::int AS total
      FROM riscos
      WHERE (${projetoId}::int IS NULL OR projeto_id = ${projetoId}::int)
      GROUP BY 1 ORDER BY 1
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
      consolidado: ind.porProjeto.map((p) => ({ projeto: p.projeto, total: p.total, criticos: p.criticos })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar dados do dashboard." }, { status: 500 });
  }
}
