import { exigirPermissao } from "@/lib/riscosAuth";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { obterIndicadores } from "@/lib/indicadoresRiscos";

export async function GET(request: NextRequest) {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
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

    const ind = await obterIndicadores(sql, Number(projetoId));

    // Riscos Críticos e Altos ainda em aberto (não Mitigado), mais graves primeiro.
    const riscosAbertos = await sql`
      SELECT id, categoria, gatilho, titulo, impacto_qualitativo, status
      FROM riscos
      WHERE projeto_id = ${projetoId} AND status <> 'Mitigado' AND impacto_qualitativo IN ('Alto', 'Crítico')
      ORDER BY (impacto_qualitativo = 'Crítico') DESC, matrix_score DESC
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

    return NextResponse.json({
      projeto,
      kpis: {
        total: ind.kpis.total,
        mitigados: ind.kpis.mitigados,
        criticos_abertos: ind.kpis.criticos,
      },
      mitigacao: ind.inerenteXAtual,
      riscosAbertos,
      planosResumo: {
        total: ind.kpis.planosTotal,
        concluidos: ind.kpis.planosConcluidos,
        abertos: ind.kpis.planosAbertos,
        acoesVencidas: ind.kpis.acoesAtrasadas,
      },
      planos,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao gerar o relatório." }, { status: 500 });
  }
}
