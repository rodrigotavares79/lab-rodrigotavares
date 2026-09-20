import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET(request: NextRequest) {
  try {
    const projetoId = request.nextUrl.searchParams.get("projetoId");
    if (!projetoId || !/^\d+$/.test(projetoId)) {
      return NextResponse.json({ error: "projetoId é obrigatório e deve ser numérico." }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });

    const projetoRows = await sql`SELECT nome FROM projetos WHERE id = ${projetoId}`;
    if (projetoRows.length === 0) {
      return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });
    }
    const projeto = projetoRows[0].nome;

    const kpisRows = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'Mitigado')::int AS mitigados,
        COUNT(*) FILTER (WHERE impacto_qualitativo = 'Alto' AND status != 'Mitigado')::int AS criticos_abertos,
        COALESCE(SUM(impacto_critico_total), 0)::float AS exposicao_critica,
        COALESCE(SUM(impacto_alto_total), 0)::float AS exposicao_alta
      FROM riscos WHERE projeto_id = ${projetoId}
    `;

    // Nível inicial x atual: mesmo cálculo do Dashboard, escopado a este projeto.
    const mitigacaoRows = await sql`
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
    `;

    // Riscos Significativos e Altos ainda em aberto (não Mitigado), mais graves primeiro.
    const riscosAbertos = await sql`
      SELECT id, categoria, gatilho, impacto_qualitativo, status
      FROM riscos
      WHERE projeto_id = ${projetoId} AND status != 'Mitigado' AND impacto_qualitativo IN ('Significativo', 'Alto')
      ORDER BY (impacto_qualitativo = 'Alto') DESC, matrix_score DESC
    `;

    // Resumo de Planos de Ação do projeto.
    const planosResumoRows = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE pa.status = 'Concluído')::int AS concluidos,
        COUNT(*) FILTER (WHERE pa.status != 'Concluído')::int AS abertos
      FROM planos_acao pa
      JOIN riscos r ON r.id = pa.risco_id
      WHERE r.projeto_id = ${projetoId}
    `;

    // Ações com prazo vencido: prazo já passou e a ação ainda não foi concluída.
    const acoesVencidasRows = await sql`
      SELECT COUNT(*)::int AS total
      FROM acoes a
      JOIN planos_acao pa ON pa.id = a.plano_acao_id
      JOIN riscos r ON r.id = pa.risco_id
      WHERE r.projeto_id = ${projetoId} AND a.status != 'Concluído' AND a.prazo IS NOT NULL AND a.prazo < CURRENT_DATE
    `;

    // Lista dos Planos de Ação do projeto, com contagem de ações (total e concluídas).
    const planos = await sql`
      SELECT
        pa.id, pa.titulo, pa.status, pa.risco_id,
        COUNT(a.id)::int AS total_acoes,
        COUNT(a.id) FILTER (WHERE a.status = 'Concluído')::int AS acoes_concluidas
      FROM planos_acao pa
      JOIN riscos r ON r.id = pa.risco_id
      LEFT JOIN acoes a ON a.plano_acao_id = pa.id
      WHERE r.projeto_id = ${projetoId}
      GROUP BY pa.id, pa.titulo, pa.status, pa.risco_id
      ORDER BY (pa.status != 'Concluído') DESC, pa.criado_em DESC
      LIMIT 20
    `;

    // Top 5 riscos por exposição financeira (Evento Crítico).
    const ranking = await sql`
      SELECT categoria, gatilho,
             COALESCE(impacto_critico_total, 0)::float AS impacto_critico_total,
             COALESCE(impacto_alto_total, 0)::float AS impacto_alto_total
      FROM riscos
      WHERE projeto_id = ${projetoId} AND impacto_critico_total IS NOT NULL
      ORDER BY impacto_critico_total DESC
      LIMIT 5
    `;

    return NextResponse.json({
      projeto,
      kpis: kpisRows[0],
      mitigacao: mitigacaoRows[0],
      riscosAbertos,
      planosResumo: { ...planosResumoRows[0], acoesVencidas: acoesVencidasRows[0].total },
      planos,
      ranking,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao gerar o relatório." }, { status: 500 });
  }
}
