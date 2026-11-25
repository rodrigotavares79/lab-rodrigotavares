// Fonte única dos indicadores do Gestão de Riscos (B03).
//
// Início, Dashboard, Relatório Executivo, menu lateral e "Ações atrasadas"
// leem daqui. Nenhuma rota deve recalcular esses números por conta própria.
//
// DEFINIÇÕES (as mesmas em todas as telas)
// - Risco ativo (= em aberto): status diferente de "Mitigado", ou seja,
//   Identificado + Em Tratamento.
// - Nível de um risco ativo: o nível ATUAL (coluna impacto_qualitativo),
//   depois dos controles. "Críticos e altos" = ativos com nível atual
//   Crítico ou Alto.
// - Distribuições (por categoria, por nível, por projeto, matriz): só riscos
//   ativos. Mitigados aparecem apenas no total e na contagem de mitigados.
// - Comparação Inerente x Atual: todos os riscos (inclusive mitigados), pois
//   mede o efeito do tratamento.
// - Meta trimestral de mitigação: base = riscos com nível INERENTE Crítico ou
//   Alto (o nível de origem não muda com os controles, então o risco não sai
//   da base ao ser tratado), cadastrados até o fim do trimestre e ainda não
//   mitigados no início dele; mitigados = os que viraram Mitigado dentro do
//   trimestre. Riscos mitigados sem data (antes da coluna mitigado_em) ficam
//   fora.
// - Plano aberto: plano com status diferente de "Concluído".
// - Ação atrasada: ação não concluída, com prazo anterior a hoje no fuso de
//   São Paulo, de risco ainda ativo.
//
// `projetoId` null = todos os projetos.

export type IndicadoresRiscos = {
  kpis: {
    total: number;
    ativos: number;
    identificados: number;
    emTratamento: number;
    mitigados: number;
    criticos: number;
    altos: number;
    planosTotal: number;
    planosAbertos: number;
    planosConcluidos: number;
    acoesTotal: number;
    acoesConcluidas: number;
    acoesAtrasadas: number;
    auditoriaPendentes: number;
  };
  categorias: { categoria: string; total: number }[];
  niveis: { nivel: string; total: number }[];
  /** Inerente x Atual: os dois sobre todos os riscos (inclusive mitigados). */
  niveisIniciais: { nivel: string; total: number }[];
  niveisAtuaisTodos: { nivel: string; total: number }[];
  inerenteXAtual: { melhorou: number; manteve: number; piorou: number };
  matriz: { prob: number; imp: number; total: number }[];
  porProjeto: { projeto: string; total: number; ativos: number; criticos: number }[];
  trimestres: { trimestre: number; total: number; mitigados: number }[];
};

const vazio = { melhorou: 0, manteve: 0, piorou: 0 };

// Planos e ações: usados pelo conjunto completo e, sozinhos, pelo menu
// lateral (que carrega em toda página e não precisa do resto).
async function resumoPlanos(sql: any, p: number | null) {
  const [linha] = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE pa.status IS DISTINCT FROM 'Concluído')::int AS abertos,
        COUNT(*) FILTER (WHERE pa.status = 'Concluído')::int AS concluidos,
        COUNT(*) FILTER (WHERE pa.auditoria_status = 'Pendente')::int AS auditoria_pendentes
      FROM planos_acao pa
      JOIN riscos r ON r.id = pa.risco_id
      WHERE (${p}::int IS NULL OR r.projeto_id = ${p}::int)
    `;
  return linha;
}

// Ação atrasada: não concluída, prazo anterior a hoje (fuso de São Paulo),
// risco ainda ativo. A lista em app/api/acoes-atrasadas usa o mesmo critério.
async function resumoAcoes(sql: any, p: number | null) {
  const [linha] = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE a.status = 'Concluído')::int AS concluidas,
        COUNT(*) FILTER (
          WHERE a.status IS DISTINCT FROM 'Concluído'
            AND r.status <> 'Mitigado'
            AND NULLIF(a.prazo::text, '')::date < (now() AT TIME ZONE 'America/Sao_Paulo')::date
        )::int AS atrasadas
      FROM acoes a
      JOIN planos_acao pa ON pa.id = a.plano_acao_id
      JOIN riscos r ON r.id = pa.risco_id
      WHERE (${p}::int IS NULL OR r.projeto_id = ${p}::int)
    `;
  return linha;
}

/** Contadores do menu lateral, com as mesmas definições do conjunto completo. */
export async function obterContadoresMenu(sql: any): Promise<{ acoesAtrasadas: number; auditoriaPendentes: number }> {
  const [planos, acoes] = await Promise.all([resumoPlanos(sql, null), resumoAcoes(sql, null)]);
  return { acoesAtrasadas: acoes.atrasadas, auditoriaPendentes: planos.auditoria_pendentes };
}

export async function obterIndicadores(sql: any, projetoId: number | null = null): Promise<IndicadoresRiscos> {
  const p = projetoId;

  const [
    [riscos],
    planos,
    acoes,
    categorias,
    niveis,
    niveisIniciais,
    niveisAtuaisTodos,
    [inerenteXAtual],
    matriz,
    porProjeto,
    trimestres,
  ] = await Promise.all([
    sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status <> 'Mitigado')::int AS ativos,
        COUNT(*) FILTER (WHERE status = 'Identificado')::int AS identificados,
        COUNT(*) FILTER (WHERE status = 'Em Tratamento')::int AS em_tratamento,
        COUNT(*) FILTER (WHERE status = 'Mitigado')::int AS mitigados,
        COUNT(*) FILTER (WHERE status <> 'Mitigado' AND impacto_qualitativo = 'Crítico')::int AS criticos,
        COUNT(*) FILTER (WHERE status <> 'Mitigado' AND impacto_qualitativo = 'Alto')::int AS altos
      FROM riscos
      WHERE (${p}::int IS NULL OR projeto_id = ${p}::int)
    `,
    resumoPlanos(sql, p),
    resumoAcoes(sql, p),
    sql`
      SELECT categoria, COUNT(*)::int AS total
      FROM riscos
      WHERE status <> 'Mitigado' AND categoria IS NOT NULL
        AND (${p}::int IS NULL OR projeto_id = ${p}::int)
      GROUP BY categoria
      ORDER BY total DESC, categoria
    `,
    sql`
      SELECT impacto_qualitativo AS nivel, COUNT(*)::int AS total
      FROM riscos
      WHERE status <> 'Mitigado' AND impacto_qualitativo IS NOT NULL
        AND (${p}::int IS NULL OR projeto_id = ${p}::int)
      GROUP BY impacto_qualitativo
    `,
    sql`
      SELECT nivel_inicial AS nivel, COUNT(*)::int AS total
      FROM riscos
      WHERE nivel_inicial IS NOT NULL
        AND (${p}::int IS NULL OR projeto_id = ${p}::int)
      GROUP BY nivel_inicial
    `,
    sql`
      SELECT impacto_qualitativo AS nivel, COUNT(*)::int AS total
      FROM riscos
      WHERE impacto_qualitativo IS NOT NULL
        AND (${p}::int IS NULL OR projeto_id = ${p}::int)
      GROUP BY impacto_qualitativo
    `,
    sql`
      SELECT
        COUNT(*) FILTER (WHERE rank_atual < rank_inicial)::int AS melhorou,
        COUNT(*) FILTER (WHERE rank_atual = rank_inicial)::int AS manteve,
        COUNT(*) FILTER (WHERE rank_atual > rank_inicial)::int AS piorou
      FROM (
        SELECT
          CASE nivel_inicial WHEN 'Baixo' THEN 1 WHEN 'Médio' THEN 2 WHEN 'Alto' THEN 3 WHEN 'Crítico' THEN 4 END AS rank_inicial,
          CASE impacto_qualitativo WHEN 'Baixo' THEN 1 WHEN 'Médio' THEN 2 WHEN 'Alto' THEN 3 WHEN 'Crítico' THEN 4 END AS rank_atual
        FROM riscos
        WHERE nivel_inicial IS NOT NULL AND impacto_qualitativo IS NOT NULL
          AND (${p}::int IS NULL OR projeto_id = ${p}::int)
      ) t
    `,
    // Posição atual na matriz (após controles); cai para o inerente quando o
    // risco ainda não tem nível atual calculado.
    sql`
      SELECT
        COALESCE(prob_nivel_atual, probabilidade)::int AS prob,
        COALESCE(imp_nivel_atual, impacto)::int AS imp,
        COUNT(*)::int AS total
      FROM riscos
      WHERE status <> 'Mitigado'
        AND COALESCE(prob_nivel_atual, probabilidade) IS NOT NULL
        AND COALESCE(imp_nivel_atual, impacto) IS NOT NULL
        AND (${p}::int IS NULL OR projeto_id = ${p}::int)
      GROUP BY 1, 2
    `,
    sql`
      SELECT p.nome AS projeto,
             COUNT(r.id)::int AS total,
             COUNT(r.id) FILTER (WHERE r.status <> 'Mitigado')::int AS ativos,
             COUNT(r.id) FILTER (WHERE r.status <> 'Mitigado' AND r.impacto_qualitativo = 'Crítico')::int AS criticos
      FROM projetos p
      LEFT JOIN riscos r ON r.projeto_id = p.id
      WHERE (${p}::int IS NULL OR p.id = ${p}::int)
      GROUP BY p.nome
      ORDER BY p.nome
    `,
    sql`
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
        ON r.nivel_inicial IN ('Crítico', 'Alto')
       AND r.criado_em < q.ini + interval '3 months'
       AND (r.status <> 'Mitigado' OR r.mitigado_em >= q.ini)
       AND (${p}::int IS NULL OR r.projeto_id = ${p}::int)
      GROUP BY q.ini
      ORDER BY q.ini
    `,
  ]);

  return {
    kpis: {
      total: riscos.total,
      ativos: riscos.ativos,
      identificados: riscos.identificados,
      emTratamento: riscos.em_tratamento,
      mitigados: riscos.mitigados,
      criticos: riscos.criticos,
      altos: riscos.altos,
      planosTotal: planos.total,
      planosAbertos: planos.abertos,
      planosConcluidos: planos.concluidos,
      acoesTotal: acoes.total,
      acoesConcluidas: acoes.concluidas,
      acoesAtrasadas: acoes.atrasadas,
      auditoriaPendentes: planos.auditoria_pendentes,
    },
    categorias,
    niveis,
    niveisIniciais,
    niveisAtuaisTodos,
    inerenteXAtual: inerenteXAtual ?? vazio,
    matriz,
    porProjeto,
    trimestres,
  };
}
