import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getUsuarioCondominio, podeVisualizarAdmin } from "@/lib/condominioAuth";

export const dynamic = "force-dynamic";

const ENCERRADOS = ["Resolvido", "Cancelado"];

export async function GET() {
  try {
    const usuario = await getUsuarioCondominio();
    if (!usuario || !podeVisualizarAdmin(usuario.perfil)) {
      return NextResponse.json({ error: "Só síndico, conselheiro ou conselheiro-admin vê o dashboard." }, { status: 403 });
    }

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });

    // --- KPIs principais ---
    const kpisRows = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE urgencia = 'Urgente')::int AS urgentes_total,
        COUNT(*) FILTER (WHERE urgencia = 'Urgente' AND status IN ('Resolvido', 'Cancelado'))::int AS urgentes_finalizados,
        COUNT(*) FILTER (WHERE status NOT IN ('Resolvido', 'Cancelado'))::int AS em_aberto,
        COUNT(*) FILTER (WHERE status NOT IN ('Resolvido', 'Cancelado') AND prazo_sla < now())::int AS sla_vencido,
        COUNT(*) FILTER (WHERE status = 'Resolvido')::int AS resolvidos,
        COUNT(*) FILTER (WHERE criado_em >= now() - interval '30 days')::int AS cadastrados_periodo_atual,
        COUNT(*) FILTER (WHERE criado_em >= now() - interval '60 days' AND criado_em < now() - interval '30 days')::int AS cadastrados_periodo_anterior
      FROM chamados
    `;

    // Demandas (tipo = 'Demanda' no catálogo) em aberto x atendidas.
    const demandasRows = await sql`
      SELECT
        COUNT(*) FILTER (WHERE s.tipo = 'Demanda' AND c.status NOT IN ('Resolvido', 'Cancelado'))::int AS demandas_em_aberto,
        COUNT(*) FILTER (WHERE s.tipo = 'Demanda' AND c.status IN ('Resolvido', 'Cancelado'))::int AS demandas_atendidas
      FROM chamados c
      LEFT JOIN catalogo_servicos s ON s.id = c.tipo_id
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
      WHERE c.criado_em >= now() - interval '30 days'
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
      WHERE status IN ('Resolvido', 'Cancelado') GROUP BY status ORDER BY total DESC
    `;
    const porStatusAndamento = await sql`
      SELECT status, COUNT(*)::int AS total FROM chamados
      WHERE status NOT IN ('Resolvido', 'Cancelado') GROUP BY status ORDER BY total DESC
    `;

    const porServicoFinalizados = await sql`
      SELECT s.nome AS servico, COUNT(*)::int AS total
      FROM chamados c JOIN catalogo_servicos s ON s.id = c.tipo_id
      WHERE c.status IN ('Resolvido', 'Cancelado')
      GROUP BY s.nome ORDER BY total DESC LIMIT 8
    `;
    const porServicoAndamento = await sql`
      SELECT s.nome AS servico, COUNT(*)::int AS total
      FROM chamados c JOIN catalogo_servicos s ON s.id = c.tipo_id
      WHERE c.status NOT IN ('Resolvido', 'Cancelado')
      GROUP BY s.nome ORDER BY total DESC LIMIT 8
    `;

    const porFornecedorFinalizados = await sql`
      SELECT f.nome_fantasia AS fornecedor, COUNT(*)::int AS total
      FROM chamados c JOIN fornecedores f ON f.id = c.fornecedor_id
      WHERE c.status IN ('Resolvido', 'Cancelado')
      GROUP BY f.nome_fantasia ORDER BY total DESC LIMIT 8
    `;
    const porFornecedorAndamento = await sql`
      SELECT f.nome_fantasia AS fornecedor, COUNT(*)::int AS total
      FROM chamados c JOIN fornecedores f ON f.id = c.fornecedor_id
      WHERE c.status NOT IN ('Resolvido', 'Cancelado')
      GROUP BY f.nome_fantasia ORDER BY total DESC LIMIT 8
    `;

    // SLA dos finalizados: só considera os Resolvidos (Cancelado não tem
    // "cumprimento de prazo" — foi encerrado sem atendimento).
    const slaFinalizadosRows = await sql`
      SELECT
        COUNT(*) FILTER (WHERE atualizado_em <= prazo_sla)::int AS dentro_prazo,
        COUNT(*) FILTER (WHERE atualizado_em > prazo_sla)::int AS fora_prazo
      FROM chamados
      WHERE status = 'Resolvido' AND prazo_sla IS NOT NULL
    `;
    const slaAndamentoRows = await sql`
      SELECT
        COUNT(*) FILTER (WHERE prazo_sla IS NULL OR prazo_sla >= now())::int AS dentro_prazo,
        COUNT(*) FILTER (WHERE prazo_sla IS NOT NULL AND prazo_sla < now())::int AS vencido
      FROM chamados
      WHERE status NOT IN ('Resolvido', 'Cancelado')
    `;

    // Atividade do mês corrente, dia a dia: abertos (criação) x encerrados
    // (virou Resolvido/Cancelado no histórico) — base pro gráfico de linha.
    const atividadeMensal = await sql`
      WITH dias AS (
        SELECT generate_series(
          date_trunc('month', now()),
          date_trunc('month', now()) + interval '1 month' - interval '1 day',
          interval '1 day'
        )::date AS dia
      ),
      abertos AS (
        SELECT date_trunc('day', criado_em)::date AS dia, COUNT(*)::int AS total
        FROM chamados
        WHERE criado_em >= date_trunc('month', now())
        GROUP BY 1
      ),
      encerrados AS (
        SELECT date_trunc('day', criado_em)::date AS dia, COUNT(*)::int AS total
        FROM chamados_historico
        WHERE status_novo IN ('Resolvido', 'Cancelado') AND criado_em >= date_trunc('month', now())
        GROUP BY 1
      )
      SELECT d.dia, COALESCE(a.total, 0)::int AS abertos, COALESCE(e.total, 0)::int AS encerrados
      FROM dias d
      LEFT JOIN abertos a ON a.dia = d.dia
      LEFT JOIN encerrados e ON e.dia = d.dia
      ORDER BY d.dia
    `;

    // Base do gráfico de bolhas: total de Problemas x total de Demandas no
    // mês corrente (recorte mensal — uma bolha por tipo).
    const porTipoMensal = await sql`
      SELECT s.tipo, COUNT(*)::int AS total
      FROM chamados c
      JOIN catalogo_servicos s ON s.id = c.tipo_id
      WHERE c.criado_em >= date_trunc('month', now()) AND s.tipo IS NOT NULL
      GROUP BY 1
    `;

    const recentes = await sql`
      SELECT c.id, c.titulo, c.status, c.urgencia, c.aberto_por_nome, c.criado_em
      FROM chamados c ORDER BY c.criado_em DESC LIMIT 8
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
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar dados do dashboard." }, { status: 500 });
  }
}
