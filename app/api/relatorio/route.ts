import { exigirPermissao } from "@/lib/riscosAuth";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { obterIndicadores } from "@/lib/indicadoresRiscos";
import { situacaoDoRisco } from "@/lib/apetiteRisco";
import { limitesVigentes } from "@/lib/apetiteServidor";
import { listarKris } from "@/lib/kriServidor";
import { situacaoMedicao } from "@/lib/kriRisco";
import { altosOuCriticos, mesesAte, type FotoIndicadores } from "@/lib/fotosIndicadores";
import { recomendacoes } from "@/lib/recomendacoesRisco";
import { hojeSaoPaulo } from "@/lib/revisaoRisco";
import { cobertura } from "@/lib/mapeamentoControles";

export const dynamic = "force-dynamic";

// B26 · Relatório Executivo. projetoId opcional: sem ele, o portfólio
// consolidado. Junta indicadores, matriz, tendências (fotos mensais), apetite
// e tolerância, KRIs, planos e as recomendações priorizadas. A data de
// referência é a data da emissão (posição do dia, fuso de São Paulo).
export async function GET(request: NextRequest) {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  try {
    const param = request.nextUrl.searchParams.get("projetoId");
    if (param && !/^\d+$/.test(param)) {
      return NextResponse.json({ error: "projetoId deve ser numérico." }, { status: 400 });
    }
    const p = param ? Number(param) : null;
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });

    let projeto = "Todos os projetos (consolidado)";
    if (p !== null) {
      const projetoRows = await sql`SELECT nome FROM projetos WHERE id = ${p}`;
      if (projetoRows.length === 0) return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });
      projeto = projetoRows[0].nome;
    }
    const hoje = hojeSaoPaulo();
    const meses = mesesAte(hoje.slice(0, 7) + "-01", 12);

    const [ind, vig, ativos, semTrat, acoesAtr, aceitPend, aceitVenc, [apetitePend], [semDono], [ctrlNao], todosKris, fotos, planos, exposicao, controlesConf] =
      await Promise.all([
        obterIndicadores(sql, p),
        limitesVigentes(sql),
        sql`
          SELECT r.id, r.categoria, r.gatilho, r.titulo, r.impacto_qualitativo, r.status, r.dono_nome, r.matrix_score,
                 EXISTS (SELECT 1 FROM planos_acao pa WHERE pa.risco_id = r.id AND pa.status IS DISTINCT FROM 'Concluído') AS tem_plano_aberto
          FROM riscos r
          WHERE r.status <> 'Mitigado' AND (${p}::int IS NULL OR r.projeto_id = ${p}::int)
          ORDER BY r.matrix_score DESC NULLS LAST, r.id
        `,
        sql`
          SELECT r.id FROM riscos_tratamento t JOIN riscos r ON r.id = t.risco_id
          WHERE t.planos = 0 AND NOT t.aceito_valido
            AND t.prazo_tratamento < (now() AT TIME ZONE 'America/Sao_Paulo')::date
            AND (${p}::int IS NULL OR r.projeto_id = ${p}::int)
        `,
        sql`
          SELECT DISTINCT r.id FROM acoes a
          JOIN planos_acao pa ON pa.id = a.plano_acao_id JOIN riscos r ON r.id = pa.risco_id
          WHERE a.status IS DISTINCT FROM 'Concluído' AND r.status <> 'Mitigado'
            AND NULLIF(a.prazo::text, '')::date < (now() AT TIME ZONE 'America/Sao_Paulo')::date
            AND (${p}::int IS NULL OR r.projeto_id = ${p}::int)
        `,
        sql`
          SELECT COUNT(*)::int AS n FROM aceitacoes_risco a JOIN riscos r ON r.id = a.risco_id
          WHERE a.situacao = 'Pendente' AND (${p}::int IS NULL OR r.projeto_id = ${p}::int)
        `,
        sql`
          SELECT r.id FROM aceitacoes_risco a JOIN riscos r ON r.id = a.risco_id
          WHERE a.situacao = 'Aprovada' AND r.status = 'Aceito'
            AND a.valido_ate <= (now() AT TIME ZONE 'America/Sao_Paulo')::date + 60
            AND (${p}::int IS NULL OR r.projeto_id = ${p}::int)
        `,
        sql`SELECT versao FROM apetite_versoes WHERE situacao = 'Pendente'`,
        sql`SELECT COUNT(*)::int AS n FROM riscos WHERE dono_email IS NULL AND status <> 'Mitigado' AND (${p}::int IS NULL OR projeto_id = ${p}::int)`,
        sql`
          SELECT COUNT(*)::int AS n FROM riscos r
          WHERE r.status <> 'Mitigado' AND NOT r.sem_controles
            AND NOT EXISTS (SELECT 1 FROM fatores_risco f WHERE f.risco_id = r.id)
            AND (${p}::int IS NULL OR r.projeto_id = ${p}::int)
        `,
        listarKris(sql),
        sql`
          SELECT to_char(referencia, 'YYYY-MM-DD') AS referencia, dados
          FROM fotos_indicadores
          WHERE COALESCE(projeto_id, 0) = ${p ?? 0} AND referencia >= ${meses[0]}
          ORDER BY referencia
        `,
        sql`
          SELECT pa.id, pa.titulo, pa.status, pa.auditoria_status, pa.risco_id,
                 COUNT(a.id)::int AS total_acoes,
                 COUNT(a.id) FILTER (WHERE a.status = 'Concluído')::int AS acoes_concluidas,
                 COUNT(a.id) FILTER (
                   WHERE a.status IS DISTINCT FROM 'Concluído'
                     AND NULLIF(a.prazo::text, '')::date < (now() AT TIME ZONE 'America/Sao_Paulo')::date
                 )::int AS acoes_atrasadas,
                 to_char(MAX(a.prazo::date) FILTER (WHERE a.status IS DISTINCT FROM 'Concluído'), 'YYYY-MM-DD') AS proximo_prazo
          FROM planos_acao pa
          JOIN riscos r ON r.id = pa.risco_id
          LEFT JOIN acoes a ON a.plano_acao_id = pa.id
          WHERE (${p}::int IS NULL OR r.projeto_id = ${p}::int)
          GROUP BY pa.id
          ORDER BY (pa.status = 'Concluído' AND pa.auditoria_status = 'Conforme'),
                   COUNT(a.id) FILTER (
                     WHERE a.status IS DISTINCT FROM 'Concluído'
                       AND NULLIF(a.prazo::text, '')::date < (now() AT TIME ZONE 'America/Sao_Paulo')::date
                   ) DESC,
                   pa.criado_em DESC
          LIMIT 25
        `,
        // B23: ranking por perda anual esperada (riscos ativos com estimativa).
        sql`
          SELECT r.id, r.categoria, r.gatilho, r.titulo, r.impacto_qualitativo, r.status,
                 r.exposicao_ale, r.exposicao_min, r.exposicao_max, r.freq_anual_provavel, r.perda_evento_provavel, r.perda_origem,
                 EXISTS (SELECT 1 FROM planos_acao pa WHERE pa.risco_id = r.id AND pa.status IS DISTINCT FROM 'Concluído') AS tem_plano_aberto
          FROM riscos r
          WHERE r.status <> 'Mitigado' AND r.exposicao_ale IS NOT NULL
            AND (${p}::int IS NULL OR r.projeto_id = ${p}::int)
          ORDER BY r.exposicao_ale DESC
        `,
        // B24: controles confirmados (mapeamento curado) dos riscos ativos do escopo.
        sql`
          SELECT rc.framework, rc.controle_id, rc.status
          FROM riscos_controles rc JOIN riscos r ON r.id = rc.risco_id
          WHERE rc.situacao = 'confirmado' AND r.status <> 'Mitigado'
            AND (${p}::int IS NULL OR r.projeto_id = ${p}::int)
        `,
      ]);

    // Apetite e tolerância (B18)
    const comApetite = (ativos as any[]).map((r) => {
      const lim = r.categoria ? vig.mapa.get(r.categoria) : undefined;
      return { ...r, situacao: situacaoDoRisco(r, vig.mapa), apetite: lim?.apetite ?? null, tolerancia: lim?.tolerancia ?? null };
    });
    const acimaApetite = comApetite
      .filter((r) => r.situacao === "acima_tolerancia" || r.situacao === "acima_apetite")
      .sort((a, b) => (a.situacao === b.situacao ? 0 : a.situacao === "acima_tolerancia" ? -1 : 1));

    // KRIs (B21) do escopo
    const kris = (todosKris as any[]).filter((k) => k.ativo && (p === null || k.projeto_id === p));
    const krisAlerta = kris
      .filter((k) => k.ultima_faixa === "vermelho" || k.ultima_faixa === "amarelo")
      .map((k) => ({
        codigo: k.codigo, nome: k.nome, unidade: k.unidade, risco_id: k.risco_id, ultimo_valor: k.ultimo_valor,
        ultima_referencia: k.ultima_referencia, ultima_faixa: k.ultima_faixa, direcao: k.direcao,
        limite_amarelo: k.limite_amarelo, limite_vermelho: k.limite_vermelho, historico: k.historico,
      }));
    const krisSemMedicao = kris.filter((k) => situacaoMedicao(k.ultima_referencia, k.frequencia, hoje) !== "em_dia").length;

    // Tendência de Alto/Crítico atual (B22): agora x três meses antes
    const porMes = new Map((fotos as any[]).map((f) => [f.referencia, f.dados as FotoIndicadores]));
    const agora = porMes.get(meses[11]);
    const antes = porMes.get(meses[8]);

    const recs = recomendacoes({
      acimaTolerancia: comApetite
        .filter((r) => r.situacao === "acima_tolerancia")
        .map((r) => ({ id: r.id, nivel: r.impacto_qualitativo, temPlanoAberto: r.tem_plano_aberto, aceito: r.status === "Aceito" })),
      acimaApetite: comApetite.filter((r) => r.situacao === "acima_apetite").length,
      krisVermelho: kris.filter((k) => k.ultima_faixa === "vermelho").map((k) => ({ codigo: k.codigo, riscoId: k.risco_id })),
      krisSemMedicao,
      semTratamento: (semTrat as any[]).map((r) => r.id),
      acoesAtrasadas: { total: ind.kpis.acoesAtrasadas, riscos: (acoesAtr as any[]).map((r) => r.id) },
      revisoesVencidas: ind.kpis.revisoesVencidas,
      planosAguardandoAuditoria: ind.kpis.auditoriaPendentes,
      aceitacoesPendentes: (aceitPend as any[])[0]?.n ?? 0,
      aceitacoesVencendo: (aceitVenc as any[]).map((r) => r.id),
      apetitePendente: apetitePend?.versao ?? null,
      semDono: semDono.n,
      controlesNaoAvaliados: ctrlNao.n,
      altoCriticoAgora: agora ? altosOuCriticos(agora.atual) : null,
      altoCriticoTresMesesAntes: antes ? altosOuCriticos(antes.atual) : null,
      maiorExposicaoSemPlano: (() => {
        const r = (exposicao as any[]).find((x) => !x.tem_plano_aberto && x.status !== "Aceito");
        return r ? { id: r.id, ale: Number(r.exposicao_ale) } : null;
      })(),
    });

    const k = ind.kpis;
    return NextResponse.json({
      projeto,
      consolidado: p === null,
      dataReferencia: hoje,
      kpis: {
        total: k.total,
        ativos: k.ativos,
        mitigados: k.mitigados,
        criticos_abertos: k.criticos,
        altos_abertos: k.altos,
        acimaTolerancia: acimaApetite.filter((r) => r.situacao === "acima_tolerancia").length,
        krisVermelho: kris.filter((x) => x.ultima_faixa === "vermelho").length,
        conformidade: k.altoCriticoTotal ? Math.round((k.altoCriticoComTratamento / k.altoCriticoTotal) * 100) : null,
        acoesAtrasadas: k.acoesAtrasadas,
        revisoesVencidas: k.revisoesVencidas,
      },
      matriz: ind.matriz,
      mitigacao: ind.inerenteXAtual,
      tendencias: { meses, fotos },
      apetite: {
        versao: vig.versao,
        acimaTolerancia: acimaApetite.filter((r) => r.situacao === "acima_tolerancia").length,
        acimaApetite: acimaApetite.filter((r) => r.situacao === "acima_apetite").length,
        riscos: acimaApetite.map((r) => ({
          id: r.id, categoria: r.categoria, gatilho: r.gatilho, titulo: r.titulo, impacto_qualitativo: r.impacto_qualitativo,
          status: r.status, dono_nome: r.dono_nome, situacao: r.situacao, apetite: r.apetite, tolerancia: r.tolerancia,
          tem_plano_aberto: r.tem_plano_aberto,
        })),
      },
      kris: { total: kris.length, semMedicao: krisSemMedicao, alerta: krisAlerta },
      riscosAbertos: comApetite
        .filter((r) => r.impacto_qualitativo === "Alto" || r.impacto_qualitativo === "Crítico")
        .sort((a, b) => Number(b.impacto_qualitativo === "Crítico") - Number(a.impacto_qualitativo === "Crítico"))
        .map((r) => ({ id: r.id, categoria: r.categoria, gatilho: r.gatilho, titulo: r.titulo, impacto_qualitativo: r.impacto_qualitativo, status: r.status, tem_plano_aberto: r.tem_plano_aberto })),
      planosResumo: {
        total: k.planosTotal,
        concluidos: k.planosConcluidos,
        abertos: k.planosAbertos,
        acoesVencidas: k.acoesAtrasadas,
        aguardandoAuditoria: k.auditoriaPendentes,
        acoesTotal: k.acoesTotal,
        acoesConcluidas: k.acoesConcluidas,
      },
      planos,
      recomendacoes: recs,
      coberturaFrameworks: cobertura(controlesConf as any[]),
      exposicao: {
        total: (exposicao as any[]).reduce((t, r) => t + Number(r.exposicao_ale), 0),
        totalMin: (exposicao as any[]).reduce((t, r) => t + Number(r.exposicao_min), 0),
        totalMax: (exposicao as any[]).reduce((t, r) => t + Number(r.exposicao_max), 0),
        comEstimativa: (exposicao as any[]).length,
        ativos: (ativos as any[]).length,
        ranking: (exposicao as any[]).slice(0, 10),
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao gerar o relatório." }, { status: 500 });
  }
}
