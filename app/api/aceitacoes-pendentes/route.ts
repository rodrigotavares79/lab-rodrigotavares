import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";
import { podeAprovarAceitacao, rotuloAlcada } from "@/lib/perfisRiscos";

export const dynamic = "force-dynamic";

// B16 · Fila de aceitações de risco aguardando decisão, de todos os riscos.
// Cada linha diz se o usuário logado pode decidir (alçada para o nível ATUAL
// do risco e não ter pedido a aceitação) — a mesma regra da rota de decisão.
export async function GET() {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const linhas = await sql`
      SELECT a.id, a.risco_id, a.justificativa, a.validade_meses, a.nivel_no_pedido,
             a.carta_nome, a.solicitado_por_nome, a.solicitado_por_email, a.solicitado_em,
             r.gatilho, r.categoria, r.impacto_qualitativo,
             ((now() AT TIME ZONE 'America/Sao_Paulo')::date
               - (a.solicitado_em AT TIME ZONE 'America/Sao_Paulo')::date)::int AS dias_aguardando
      FROM aceitacoes_risco a
      JOIN riscos r ON r.id = a.risco_id
      WHERE a.situacao = 'Pendente'
      ORDER BY a.solicitado_em ASC
    `;
    const usuario = guarda.usuario;
    const aceitacoes = linhas.map((l: any) => {
      const proprio = String(l.solicitado_por_email || "").toLowerCase() === usuario.email.toLowerCase();
      const { solicitado_por_email, ...resto } = l;
      return {
        ...resto,
        alcada: rotuloAlcada(l.impacto_qualitativo),
        podeDecidir: !proprio && podeAprovarAceitacao(usuario.perfil, l.impacto_qualitativo),
        motivoSemDecisao: proprio ? "Pedido seu" : podeAprovarAceitacao(usuario.perfil, l.impacto_qualitativo) ? null : "Fora da sua alçada",
      };
    });
    return NextResponse.json({ aceitacoes });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar as aceitações pendentes." }, { status: 500 });
  }
}
