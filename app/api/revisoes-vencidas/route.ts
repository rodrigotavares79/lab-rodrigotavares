import { exigirPermissao } from "@/lib/riscosAuth";
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// Riscos ativos com revisão periódica vencida (B17), dos mais atrasados para
// os menos. O critério é o mesmo da contagem em lib/indicadoresRiscos
// (revisoesVencidas): se mudar um, mude o outro.
export const dynamic = "force-dynamic";

export async function GET() {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const riscos = await sql`
      SELECT
        r.id, r.gatilho, r.titulo, r.categoria, r.impacto_qualitativo, r.status,
        p.nome AS projeto,
        to_char(rv.revisado_em AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS revisado_em,
        rv.dias_revisao, to_char(rv.proxima_revisao, 'YYYY-MM-DD') AS proxima_revisao,
        ((now() AT TIME ZONE 'America/Sao_Paulo')::date - rv.proxima_revisao)::int AS dias_atraso
      FROM riscos r
      JOIN riscos_revisao rv ON rv.risco_id = r.id
      JOIN projetos p ON p.id = r.projeto_id
      WHERE r.status <> 'Mitigado'
        AND rv.proxima_revisao < (now() AT TIME ZONE 'America/Sao_Paulo')::date
      ORDER BY rv.proxima_revisao ASC, r.id
    `;
    return NextResponse.json({ riscos });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar as revisões vencidas." }, { status: 500 });
  }
}
