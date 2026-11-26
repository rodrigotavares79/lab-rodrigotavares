import { exigirPermissao } from "@/lib/riscosAuth";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { obterIndicadores } from "@/lib/indicadoresRiscos";
import { situacaoDoRisco } from "@/lib/apetiteRisco";
import { limitesVigentes } from "@/lib/apetiteServidor";
import { listarKris } from "@/lib/kriServidor";
import { situacaoMedicao } from "@/lib/kriRisco";
import { altosOuCriticos, conformidadeTratamento, mesesAte, serie, type FotoIndicadores } from "@/lib/fotosIndicadores";
import { hojeSaoPaulo } from "@/lib/revisaoRisco";
import { cobertura } from "@/lib/mapeamentoControles";
import { acoesPorPrazo, apetitePorCategoria, funilTratamento } from "@/lib/cockpitRisco";

export const dynamic = "force-dynamic";

// Dashboard (cockpit). Os indicadores de base vêm de lib/indicadoresRiscos
// (fonte única, mesmas definições do Início e do Relatório Executivo); o
// resto junta apetite (B18), KRIs (B21), fotos mensais (B22), exposição (B23)
// e cobertura de frameworks (B24) para a leitura gerencial numa tela só.
// projetoId opcional: sem ele, todos os projetos.
export async function GET(request: NextRequest) {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  try {
    const projetoParam = request.nextUrl.searchParams.get("projetoId");
    if (projetoParam && !/^\d+$/.test(projetoParam)) {
      return NextResponse.json({ error: "projetoId deve ser numérico." }, { status: 400 });
    }
    const p = projetoParam ? Number(projetoParam) : null;
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const hoje = hojeSaoPaulo();
    const meses = mesesAte(hoje.slice(0, 7) + "-01", 6);

    const [ind, vig, riscos, prazosAcoes, [aceit], [apetitePend], [semDono], todosKris, fotos, controlesConf] = await Promise.all([
      obterIndicadores(sql, p),
      limitesVigentes(sql),
      // Todos os riscos do escopo com o resumo dos planos: base do apetite
      // (só ativos), do funil do tratamento, da exposição e do consolidado.
      sql`
        SELECT r.id, r.projeto_id, pr.nome AS projeto, r.categoria, r.gatilho, r.titulo,
               r.impacto_qualitativo, r.status, r.exposicao_ale,
               COUNT(pa.id)::int AS planos,
               COUNT(pa.id) FILTER (WHERE pa.status IS DISTINCT FROM 'Concluído')::int AS planos_abertos,
               COUNT(pa.id) FILTER (WHERE pa.status = 'Concluído' AND pa.auditoria_status = 'Conforme')::int AS planos_conformes
        FROM riscos r
        JOIN projetos pr ON pr.id = r.projeto_id
        LEFT JOIN planos_acao pa ON pa.risco_id = r.id
        WHERE (${p}::int IS NULL OR r.projeto_id = ${p}::int)
        GROUP BY r.id, pr.nome
      `,
      // Ações abertas de riscos ativos (mesmo universo de "ação atrasada").
      sql`
        SELECT to_char(NULLIF(a.prazo::text, '')::date, 'YYYY-MM-DD') AS prazo
        FROM acoes a
        JOIN planos_acao pa ON pa.id = a.plano_acao_id
        JOIN riscos r ON r.id = pa.risco_id
        WHERE a.status IS DISTINCT FROM 'Concluído' AND r.status <> 'Mitigado'
          AND (${p}::int IS NULL OR r.projeto_id = ${p}::int)
      `,
      sql`
        SELECT
          COUNT(*) FILTER (WHERE a.situacao = 'Pendente')::int AS pendentes,
          COUNT(*) FILTER (
            WHERE a.situacao = 'Aprovada' AND r.status = 'Aceito'
              AND a.valido_ate >= (now() AT TIME ZONE 'America/Sao_Paulo')::date
          )::int AS vigentes,
          COUNT(*) FILTER (
            WHERE a.situacao = 'Aprovada' AND r.status = 'Aceito'
              AND a.valido_ate >= (now() AT TIME ZONE 'America/Sao_Paulo')::date
              AND a.valido_ate <= (now() AT TIME ZONE 'America/Sao_Paulo')::date + 60
          )::int AS vencendo
        FROM aceitacoes_risco a JOIN riscos r ON r.id = a.risco_id
        WHERE (${p}::int IS NULL OR r.projeto_id = ${p}::int)
      `,
      sql`SELECT versao FROM apetite_versoes WHERE situacao = 'Pendente'`,
      sql`SELECT COUNT(*)::int AS n FROM riscos WHERE dono_email IS NULL AND status <> 'Mitigado' AND (${p}::int IS NULL OR projeto_id = ${p}::int)`,
      listarKris(sql),
      sql`
        SELECT to_char(referencia, 'YYYY-MM-DD') AS referencia, dados
        FROM fotos_indicadores
        WHERE COALESCE(projeto_id, 0) = ${p ?? 0} AND referencia >= ${meses[0]}
        ORDER BY referencia
      `,
      sql`
        SELECT rc.framework, rc.controle_id, rc.status
        FROM riscos_controles rc JOIN riscos r ON r.id = rc.risco_id
        WHERE rc.situacao = 'confirmado' AND r.status <> 'Mitigado'
          AND (${p}::int IS NULL OR r.projeto_id = ${p}::int)
      `,
    ]);

    const todos = riscos as any[];
    const ativos = todos
      .filter((r) => r.status !== "Mitigado")
      .map((r) => ({ ...r, situacao: situacaoDoRisco(r, vig.mapa), ale: r.exposicao_ale === null ? null : Number(r.exposicao_ale) }));
    const acimaTolerancia = ativos.filter((r) => r.situacao === "acima_tolerancia").length;
    const acimaApetite = ativos.filter((r) => r.situacao === "acima_apetite").length;
    const comEstimativa = ativos.filter((r) => r.ale !== null);
    const perdaAnual = comEstimativa.reduce((t, r) => t + r.ale, 0);

    // KRIs ativos do escopo, piores primeiro.
    const ORDEM_FAIXA: Record<string, number> = { vermelho: 0, amarelo: 1, verde: 2 };
    const kris = (todosKris as any[])
      .filter((k) => k.ativo && (p === null || k.projeto_id === p))
      .map((k) => ({
        id: k.id, codigo: k.codigo, nome: k.nome, unidade: k.unidade, risco_id: k.risco_id,
        ultimo_valor: k.ultimo_valor, ultima_referencia: k.ultima_referencia, ultima_faixa: k.ultima_faixa,
        historico: k.historico, medicao: situacaoMedicao(k.ultima_referencia, k.frequencia, hoje),
      }))
      .sort((a, b) => (ORDEM_FAIXA[a.ultima_faixa] ?? 3) - (ORDEM_FAIXA[b.ultima_faixa] ?? 3) || String(a.codigo).localeCompare(String(b.codigo)));

    // Tendência dos KPIs: fotos mensais (B22). O mês corrente usa o valor ao
    // vivo; a variação compara com a foto do mês anterior.
    const f = fotos as { referencia: string; dados: FotoIndicadores }[];
    const k = ind.kpis;
    const conformidadeHoje = k.altoCriticoTotal ? Math.round((k.altoCriticoComTratamento / k.altoCriticoTotal) * 100) : null;
    const comHoje = (s: (number | null)[], hojeValor: number | null) => [...s.slice(0, -1), hojeValor];
    const tendencia = {
      meses,
      ativos: comHoje(serie(meses, f, (d) => d.ativos), k.ativos),
      criticosAltos: comHoje(serie(meses, f, (d) => altosOuCriticos(d.ativosPorNivel)), k.criticos + k.altos),
      conformidade: comHoje(serie(meses, f, (d) => conformidadeTratamento(d) as number), conformidadeHoje),
      acoesAtrasadas: comHoje(serie(meses, f, (d) => d.acoesAtrasadas), k.acoesAtrasadas),
    };

    // Consolidado por projeto (só sem filtro de projeto).
    const porProjeto = new Map<string, { projeto: string; projeto_id: number; total: number; ativos: number; criticos: number; acimaTolerancia: number; perdaAnual: number }>();
    for (const r of todos) {
      const l = porProjeto.get(r.projeto) ?? { projeto: r.projeto, projeto_id: r.projeto_id, total: 0, ativos: 0, criticos: 0, acimaTolerancia: 0, perdaAnual: 0 };
      l.total++;
      porProjeto.set(r.projeto, l);
    }
    for (const r of ativos) {
      const l = porProjeto.get(r.projeto)!;
      l.ativos++;
      if (r.impacto_qualitativo === "Crítico") l.criticos++;
      if (r.situacao === "acima_tolerancia") l.acimaTolerancia++;
      if (r.ale !== null) l.perdaAnual += r.ale;
    }

    return NextResponse.json({
      dataReferencia: hoje,
      kpis: {
        total: k.total,
        ativos: k.ativos,
        mitigados: k.mitigados,
        criticos: k.criticos,
        altos: k.altos,
        criticosAltos: k.criticos + k.altos,
        acimaTolerancia,
        acimaApetite,
        perdaAnual,
        comEstimativa: comEstimativa.length,
        conformidade: conformidadeHoje,
        altoCriticoTotal: k.altoCriticoTotal,
        acoesAtrasadas: k.acoesAtrasadas,
      },
      tendencia,
      matriz: ind.matriz,
      apetite: { versao: vig.versao, porCategoria: apetitePorCategoria(ativos) },
      funil: funilTratamento(
        todos.map((r) => ({ status: r.status, planos: r.planos, planosAbertos: r.planos_abertos, planosConformes: r.planos_conformes }))
      ),
      acoesPrazo: acoesPorPrazo((prazosAcoes as any[]).map((a) => a.prazo), hoje),
      aceitacoes: aceit,
      mitigacao: ind.inerenteXAtual,
      niveisIniciais: ind.niveisIniciais,
      niveisAtuaisTodos: ind.niveisAtuaisTodos,
      kris,
      exposicao: {
        total: perdaAnual,
        comEstimativa: comEstimativa.length,
        ativos: ativos.length,
        top: [...comEstimativa]
          .sort((a, b) => b.ale - a.ale)
          .slice(0, 5)
          .map((r) => ({ id: r.id, titulo: r.titulo, gatilho: r.gatilho, impacto_qualitativo: r.impacto_qualitativo, ale: r.ale })),
      },
      coberturaFrameworks: cobertura(controlesConf as any[]),
      pendencias: {
        semTratamento: k.semTratamento,
        revisoesVencidas: k.revisoesVencidas,
        auditoriaPendentes: k.auditoriaPendentes,
        aceitacoesPendentes: aceit.pendentes,
        apetitePendente: apetitePend?.versao ?? null,
        semDono: semDono.n,
        krisSemMedicao: kris.filter((x) => x.medicao !== "em_dia").length,
      },
      consolidado: [...porProjeto.values()].sort((a, b) => b.acimaTolerancia - a.acimaTolerancia || b.criticos - a.criticos || b.ativos - a.ativos),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar dados do dashboard." }, { status: 500 });
  }
}
