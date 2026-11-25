import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";

export const dynamic = "force-dynamic";

// Todos os planos de ação, de todos os riscos, com o resumo das ações
// (total, concluídas, atrasadas, próximo prazo e responsáveis). Usada pela
// tela "Todos os planos". Ação atrasada segue o critério de
// app/api/acoes-atrasadas: prazo vencido e não concluída, em risco não mitigado.
export async function GET() {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const planos = await sql`
      SELECT
        pa.id, pa.titulo, pa.status, pa.criado_em, pa.concluido_em, pa.auditoria_status,
        r.id AS risco_id, r.gatilho, r.titulo AS risco_titulo, r.categoria, r.impacto_qualitativo, r.status AS risco_status,
        COUNT(a.id)::int AS acoes_total,
        COUNT(a.id) FILTER (WHERE a.status = 'Concluído')::int AS acoes_concluidas,
        COUNT(a.id) FILTER (
          WHERE a.status IS DISTINCT FROM 'Concluído'
            AND r.status <> 'Mitigado'
            AND NULLIF(a.prazo::text, '')::date < (now() AT TIME ZONE 'America/Sao_Paulo')::date
        )::int AS acoes_atrasadas,
        to_char(MIN(NULLIF(a.prazo::text, '')::date) FILTER (WHERE a.status IS DISTINCT FROM 'Concluído'), 'YYYY-MM-DD')
          AS proximo_prazo,
        COALESCE(
          array_agg(DISTINCT a.responsavel) FILTER (WHERE a.responsavel IS NOT NULL AND a.responsavel <> ''),
          '{}'
        ) AS responsaveis
      FROM planos_acao pa
      JOIN riscos r ON r.id = pa.risco_id
      LEFT JOIN acoes a ON a.plano_acao_id = pa.id
      GROUP BY pa.id, r.id
      ORDER BY pa.criado_em DESC, pa.id DESC
    `;
    // Usuário sem acesso à auditoria não vê o resultado da auditoria.
    const verAuditoria = !!guarda.usuario.permissoes.verAuditoria;
    return NextResponse.json({
      verAuditoria,
      planos: verAuditoria ? planos : planos.map((p: any) => ({ ...p, auditoria_status: null })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar os planos de ação." }, { status: 500 });
  }
}
