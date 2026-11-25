import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";

export const dynamic = "force-dynamic";

const DATA = /^\d{4}-\d{2}-\d{2}$/;

// GET ?projetoId=<id|vazio = todos>&inicio=AAAA-MM-DD&fim=AAAA-MM-DD
// Relatório de auditoria: um registro por plano de ação, com projeto,
// responsáveis (das ações), prazo, status e conformidade. O período filtra
// pelo prazo do plano — o maior prazo entre as ações dele.
export async function GET(request: NextRequest) {
  try {
    const guarda = await exigirPermissao("verAuditoria");
    if (guarda.resposta) return guarda.resposta;

    const p = request.nextUrl.searchParams;
    const projetoId = p.get("projetoId") || "";
    const inicio = p.get("inicio") || "";
    const fim = p.get("fim") || "";

    if (projetoId && !/^\d+$/.test(projetoId)) {
      return NextResponse.json({ error: "Projeto inválido." }, { status: 400 });
    }
    if (!DATA.test(inicio) || !DATA.test(fim)) {
      return NextResponse.json({ error: "Informe a data inicial e a final do período." }, { status: 400 });
    }
    if (inicio > fim) {
      return NextResponse.json({ error: "A data inicial é posterior à final." }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });

    const linhas = await sql`
      WITH planos AS (
        SELECT
          pa.id, pa.titulo, pa.status, pa.auditoria_status, pa.auditado_em, pa.auditado_por_nome,
          pa.auditoria_comentario,
          r.id AS risco_id, r.gatilho, r.titulo AS risco_titulo, pr.id AS projeto_id, pr.nome AS projeto,
          MAX(NULLIF(a.prazo::text, '')::date) AS prazo,
          STRING_AGG(DISTINCT NULLIF(TRIM(a.responsavel), ''), ', ') AS responsaveis,
          COUNT(a.id)::int AS total_acoes,
          COUNT(a.id) FILTER (WHERE a.status = 'Concluído')::int AS acoes_concluidas
        FROM planos_acao pa
        JOIN riscos r ON r.id = pa.risco_id
        JOIN projetos pr ON pr.id = r.projeto_id
        LEFT JOIN acoes a ON a.plano_acao_id = pa.id
        GROUP BY pa.id, r.id, pr.id
      )
      SELECT *
      FROM planos
      WHERE prazo BETWEEN ${inicio}::date AND ${fim}::date
        AND (${projetoId} = '' OR projeto_id = NULLIF(${projetoId}, '')::int)
      ORDER BY projeto, prazo, id
    `;

    const resumo = { conforme: 0, nao_conforme: 0, pendente: 0, nao_auditado: 0 };
    for (const l of linhas as any[]) {
      if (l.auditoria_status === "Conforme") resumo.conforme++;
      else if (l.auditoria_status === "Não conforme") resumo.nao_conforme++;
      else if (l.auditoria_status === "Pendente") resumo.pendente++;
      else resumo.nao_auditado++;
    }

    return NextResponse.json({ linhas, resumo, total: linhas.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao gerar o relatório de auditoria." }, { status: 500 });
  }
}
