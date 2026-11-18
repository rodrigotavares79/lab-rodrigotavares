import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getUsuarioCondominio, podeVisualizarAdmin } from "@/lib/condominioAuth";

export const dynamic = "force-dynamic";

const ENCERRADOS = ["Resolvido", "Cancelado"];

const DIA_MS = 24 * 60 * 60 * 1000;
const MAX_DIAS_PERIODO = 366;

// Datas do filtro chegam como AAAA-MM-DD e são interpretadas no horário de
// Brasília (UTC-3, sem horário de verão desde 2019).
function inicioDoDiaBrasilia(data: string): Date {
  return new Date(`${data}T00:00:00-03:00`);
}

function dataBrasilia(d: Date): string {
  return new Date(d.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function rotuloData(data: string): string {
  const [a, m, d] = data.split("-");
  return `${d}/${m}/${a}`;
}

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioCondominio();
    if (!usuario) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    // Todos os perfis veem os números globais do condomínio (KPIs e
    // gráficos são agregados, sem identificar morador). A única parte com
    // dados individuais — a lista de chamados recentes — é filtrada: o
    // condômino comum só vê os chamados que ele mesmo abriu.
    const veTodosChamados = podeVisualizarAdmin(usuario.perfil);

    // --- Período ---
    // Sem filtro: todo o histórico (gráfico de atividade e Problemas x
    // Demandas no mês corrente; tendência e serviço mais solicitado nos
    // últimos 30 dias). Com filtro (?de=AAAA-MM-DD&ate=AAAA-MM-DD): tudo é
    // recortado pelos chamados ABERTOS no período, e a tendência compara com
    // o período anterior de mesma duração.
    const de = request.nextUrl.searchParams.get("de");
    const ate = request.nextUrl.searchParams.get("ate");
    const formatoData = /^\d{4}-\d{2}-\d{2}$/;
    let filtroIni: string | null = null;
    let filtroFim: string | null = null;
    let rotuloPeriodo = "Todo o período";
    if (de || ate) {
      if (!de || !ate || !formatoData.test(de) || !formatoData.test(ate)) {
        return NextResponse.json({ error: "Informe as duas datas do período (início e fim)." }, { status: 400 });
      }
      const ini = inicioDoDiaBrasilia(de);
      const fimExclusivo = new Date(inicioDoDiaBrasilia(ate).getTime() + DIA_MS);
      if (isNaN(ini.getTime()) || isNaN(fimExclusivo.getTime()) || ini >= fimExclusivo) {
        return NextResponse.json({ error: "A data inicial precisa ser anterior ou igual à final." }, { status: 400 });
      }
      if ((fimExclusivo.getTime() - ini.getTime()) / DIA_MS > MAX_DIAS_PERIODO) {
        return NextResponse.json({ error: "Escolha um período de até 1 ano." }, { status: 400 });
      }
      filtroIni = ini.toISOString();
      filtroFim = fimExclusivo.toISOString();
      rotuloPeriodo = de === ate ? rotuloData(de) : `${rotuloData(de)} a ${rotuloData(ate)}`;
    }

    const agora = new Date();
    // Janela "atual" e "anterior" da tendência de chamados cadastrados.
    const tendIni = filtroIni ? new Date(filtroIni) : new Date(agora.getTime() - 30 * DIA_MS);
    const tendFim = filtroFim ? new Date(filtroFim) : agora;
    const tendDuracao = tendFim.getTime() - tendIni.getTime();
    const tendAntIni = new Date(tendIni.getTime() - tendDuracao);
    // Janela do serviço mais solicitado.
    const servIni = filtroIni ?? new Date(agora.getTime() - 30 * DIA_MS).toISOString();
    const servFim = filtroFim ?? agora.toISOString();
    // Janela dos gráficos de atividade e Problemas x Demandas.
    const mesAtualIni = `${dataBrasilia(agora).slice(0, 7)}-01`;
    const proxMes = new Date(inicioDoDiaBrasilia(mesAtualIni).getTime() + 32 * DIA_MS);
    const mesAtualFimExclusivo = inicioDoDiaBrasilia(`${dataBrasilia(proxMes).slice(0, 7)}-01`);
    const grafIni = filtroIni ?? inicioDoDiaBrasilia(mesAtualIni).toISOString();
    const grafFim = filtroFim ?? mesAtualFimExclusivo.toISOString();
    const grafDiaIni = dataBrasilia(new Date(grafIni));
    const grafDiaFim = dataBrasilia(new Date(new Date(grafFim).getTime() - 1));
    const rotuloGrafico = filtroIni
      ? rotuloPeriodo
      : (() => {
          const t = agora.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
          return t.charAt(0).toUpperCase() + t.slice(1);
        })();

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });

    // Recorte do período aplicado a todas as consultas de chamados.
    const pIni = filtroIni;
    const pFim = filtroFim;

    // --- KPIs principais ---
    const kpisRows = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE urgencia = 'Urgente')::int AS urgentes_total,
        COUNT(*) FILTER (WHERE urgencia = 'Urgente' AND status IN ('Resolvido', 'Cancelado'))::int AS urgentes_finalizados,
        COUNT(*) FILTER (WHERE status NOT IN ('Resolvido', 'Cancelado'))::int AS em_aberto,
        COUNT(*) FILTER (WHERE status NOT IN ('Resolvido', 'Cancelado') AND prazo_sla < now())::int AS sla_vencido,
        COUNT(*) FILTER (WHERE status = 'Resolvido')::int AS resolvidos,
        (SELECT COUNT(*)::int FROM chamados
          WHERE criado_em >= ${tendIni.toISOString()}::timestamptz AND criado_em < ${tendFim.toISOString()}::timestamptz) AS cadastrados_periodo_atual,
        (SELECT COUNT(*)::int FROM chamados
          WHERE criado_em >= ${tendAntIni.toISOString()}::timestamptz AND criado_em < ${tendIni.toISOString()}::timestamptz) AS cadastrados_periodo_anterior
      FROM chamados
      WHERE criado_em >= COALESCE(${pIni}::timestamptz, '-infinity') AND criado_em < COALESCE(${pFim}::timestamptz, 'infinity')
    `;

    // Demandas (tipo = 'Demanda' no catálogo) em aberto x atendidas.
    const demandasRows = await sql`
      SELECT
        COUNT(*) FILTER (WHERE s.tipo = 'Demanda' AND c.status NOT IN ('Resolvido', 'Cancelado'))::int AS demandas_em_aberto,
        COUNT(*) FILTER (WHERE s.tipo = 'Demanda' AND c.status IN ('Resolvido', 'Cancelado'))::int AS demandas_atendidas
      FROM chamados c
      LEFT JOIN catalogo_servicos s ON s.id = c.tipo_id
      WHERE c.criado_em >= COALESCE(${pIni}::timestamptz, '-infinity') AND c.criado_em < COALESCE(${pFim}::timestamptz, 'infinity')
    `;

    // Serviço mais solicitado no último mês. Desempate: nº de chamados,
    // depois se é incidente (tipo = 'Problema'), depois maior urgência do
    // serviço, depois se teve algum chamado marcado como global.
    const servicoMesRows = await sql`
      SELECT
        s.nome AS servico,
        s.tipo,
        s.urgencia,
        COUNT(*)::int AS total,
        BOOL_OR(c.global) AS tem_global
      FROM chamados c
      JOIN catalogo_servicos s ON s.id = c.tipo_id
      WHERE c.criado_em >= ${servIni}::timestamptz AND c.criado_em < ${servFim}::timestamptz
      GROUP BY s.nome, s.tipo, s.urgencia
      ORDER BY
        total DESC,
        (s.tipo = 'Problema') DESC,
        CASE s.urgencia WHEN 'Urgente' THEN 3 WHEN 'Média' THEN 2 WHEN 'Baixa' THEN 1 ELSE 0 END DESC,
        tem_global DESC
      LIMIT 1
    `;

    // --- Painéis "Finalizados" e "Em andamento" ---
    const porStatusFinalizados = await sql`
      SELECT status, COUNT(*)::int AS total FROM chamados
      WHERE status IN ('Resolvido', 'Cancelado') AND criado_em >= COALESCE(${pIni}::timestamptz, '-infinity') AND criado_em < COALESCE(${pFim}::timestamptz, 'infinity')
      GROUP BY status ORDER BY total DESC
    `;
    const porStatusAndamento = await sql`
      SELECT status, COUNT(*)::int AS total FROM chamados
      WHERE status NOT IN ('Resolvido', 'Cancelado') AND criado_em >= COALESCE(${pIni}::timestamptz, '-infinity') AND criado_em < COALESCE(${pFim}::timestamptz, 'infinity')
      GROUP BY status ORDER BY total DESC
    `;

    const porServicoFinalizados = await sql`
      SELECT s.nome AS servico, COUNT(*)::int AS total
      FROM chamados c JOIN catalogo_servicos s ON s.id = c.tipo_id
      WHERE c.status IN ('Resolvido', 'Cancelado') AND c.criado_em >= COALESCE(${pIni}::timestamptz, '-infinity') AND c.criado_em < COALESCE(${pFim}::timestamptz, 'infinity')
      GROUP BY s.nome ORDER BY total DESC LIMIT 8
    `;
    const porServicoAndamento = await sql`
      SELECT s.nome AS servico, COUNT(*)::int AS total
      FROM chamados c JOIN catalogo_servicos s ON s.id = c.tipo_id
      WHERE c.status NOT IN ('Resolvido', 'Cancelado') AND c.criado_em >= COALESCE(${pIni}::timestamptz, '-infinity') AND c.criado_em < COALESCE(${pFim}::timestamptz, 'infinity')
      GROUP BY s.nome ORDER BY total DESC LIMIT 8
    `;

    const porFornecedorFinalizados = await sql`
      SELECT f.nome_fantasia AS fornecedor, COUNT(*)::int AS total
      FROM chamados c JOIN fornecedores f ON f.id = c.fornecedor_id
      WHERE c.status IN ('Resolvido', 'Cancelado') AND c.criado_em >= COALESCE(${pIni}::timestamptz, '-infinity') AND c.criado_em < COALESCE(${pFim}::timestamptz, 'infinity')
      GROUP BY f.nome_fantasia ORDER BY total DESC LIMIT 8
    `;
    const porFornecedorAndamento = await sql`
      SELECT f.nome_fantasia AS fornecedor, COUNT(*)::int AS total
      FROM chamados c JOIN fornecedores f ON f.id = c.fornecedor_id
      WHERE c.status NOT IN ('Resolvido', 'Cancelado') AND c.criado_em >= COALESCE(${pIni}::timestamptz, '-infinity') AND c.criado_em < COALESCE(${pFim}::timestamptz, 'infinity')
      GROUP BY f.nome_fantasia ORDER BY total DESC LIMIT 8
    `;

    // SLA dos finalizados: só considera os Resolvidos (Cancelado não tem
    // "cumprimento de prazo" — foi encerrado sem atendimento).
    const slaFinalizadosRows = await sql`
      SELECT
        COUNT(*) FILTER (WHERE atualizado_em <= prazo_sla)::int AS dentro_prazo,
        COUNT(*) FILTER (WHERE atualizado_em > prazo_sla)::int AS fora_prazo
      FROM chamados
      WHERE status = 'Resolvido' AND prazo_sla IS NOT NULL AND criado_em >= COALESCE(${pIni}::timestamptz, '-infinity') AND criado_em < COALESCE(${pFim}::timestamptz, 'infinity')
    `;
    const slaAndamentoRows = await sql`
      SELECT
        COUNT(*) FILTER (WHERE prazo_sla IS NULL OR prazo_sla >= now())::int AS dentro_prazo,
        COUNT(*) FILTER (WHERE prazo_sla IS NOT NULL AND prazo_sla < now())::int AS vencido
      FROM chamados
      WHERE status NOT IN ('Resolvido', 'Cancelado') AND criado_em >= COALESCE(${pIni}::timestamptz, '-infinity') AND criado_em < COALESCE(${pFim}::timestamptz, 'infinity')
    `;

    // Atividade dia a dia (no período filtrado ou, sem filtro, no mês
    // corrente): abertos (criação) x encerrados (virou Resolvido/Cancelado no
    // histórico). Dias contados no horário de Brasília.
    const atividadeMensal = await sql`
      WITH dias AS (
        SELECT generate_series(${grafDiaIni}::date, ${grafDiaFim}::date, interval '1 day')::date AS dia
      ),
      abertos AS (
        SELECT (criado_em AT TIME ZONE 'America/Sao_Paulo')::date AS dia, COUNT(*)::int AS total
        FROM chamados
        WHERE criado_em >= ${grafIni}::timestamptz AND criado_em < ${grafFim}::timestamptz
        GROUP BY 1
      ),
      encerrados AS (
        SELECT (criado_em AT TIME ZONE 'America/Sao_Paulo')::date AS dia, COUNT(*)::int AS total
        FROM chamados_historico
        WHERE status_novo IN ('Resolvido', 'Cancelado')
          AND criado_em >= ${grafIni}::timestamptz AND criado_em < ${grafFim}::timestamptz
        GROUP BY 1
      )
      SELECT to_char(d.dia, 'YYYY-MM-DD') AS dia, COALESCE(a.total, 0)::int AS abertos, COALESCE(e.total, 0)::int AS encerrados
      FROM dias d
      LEFT JOIN abertos a ON a.dia = d.dia
      LEFT JOIN encerrados e ON e.dia = d.dia
      ORDER BY d.dia
    `;

    // Problemas x Demandas na mesma janela do gráfico de atividade.
    const porTipoMensal = await sql`
      SELECT s.tipo, COUNT(*)::int AS total
      FROM chamados c
      JOIN catalogo_servicos s ON s.id = c.tipo_id
      WHERE c.criado_em >= ${grafIni}::timestamptz AND c.criado_em < ${grafFim}::timestamptz AND s.tipo IS NOT NULL
      GROUP BY 1
    `;

    const recentes = veTodosChamados
      ? await sql`
          SELECT c.id, c.titulo, c.status, c.urgencia, c.aberto_por_nome, c.criado_em
          FROM chamados c
          WHERE c.criado_em >= COALESCE(${pIni}::timestamptz, '-infinity') AND c.criado_em < COALESCE(${pFim}::timestamptz, 'infinity')
          ORDER BY c.criado_em DESC LIMIT 8
        `
      : await sql`
          SELECT c.id, c.titulo, c.status, c.urgencia, c.aberto_por_nome, c.criado_em
          FROM chamados c
          WHERE c.aberto_por_email = ${usuario.email}
            AND c.criado_em >= COALESCE(${pIni}::timestamptz, '-infinity') AND c.criado_em < COALESCE(${pFim}::timestamptz, 'infinity')
          ORDER BY c.criado_em DESC LIMIT 8
        `;

    return NextResponse.json({
      kpis: { ...kpisRows[0], ...demandasRows[0] },
      servicoMaisSolicitado: servicoMesRows[0] || null,
      finalizados: {
        porStatus: porStatusFinalizados,
        porServico: porServicoFinalizados,
        porFornecedor: porFornecedorFinalizados,
        sla: slaFinalizadosRows[0],
      },
      andamento: {
        porStatus: porStatusAndamento,
        porServico: porServicoAndamento,
        porFornecedor: porFornecedorAndamento,
        sla: slaAndamentoRows[0],
      },
      atividadeMensal,
      porTipoMensal,
      recentes,
      apenasMeusChamados: !veTodosChamados,
      periodo: {
        de: de ?? null,
        ate: ate ?? null,
        rotulo: rotuloPeriodo,
        rotuloGrafico,
        filtrado: !!filtroIni,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar dados dos relatórios." }, { status: 500 });
  }
}
