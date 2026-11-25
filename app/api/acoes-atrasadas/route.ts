import { exigirPermissao } from "@/lib/riscosAuth";
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// Ações com prazo vencido e ainda não concluídas, com o plano e o risco de
// origem. Usada pela página "Ações atrasadas" (link do KPI da página inicial).
// O critério é o mesmo da contagem em lib/indicadoresRiscos (acoesAtrasadas):
// se mudar um, mude o outro.
export const dynamic = "force-dynamic";

export async function GET() {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });

    const acoes = await sql`
      SELECT
        a.id, a.descricao, a.responsavel, a.prazo, a.status,
        pa.titulo AS plano,
        r.id AS risco_id, r.gatilho, r.titulo, r.categoria, r.impacto_qualitativo,
        ((now() AT TIME ZONE 'America/Sao_Paulo')::date - NULLIF(a.prazo::text, '')::date)::int AS dias_atraso
      FROM acoes a
      JOIN planos_acao pa ON pa.id = a.plano_acao_id
      JOIN riscos r ON r.id = pa.risco_id
      WHERE a.status IS DISTINCT FROM 'Concluído'
        AND r.status <> 'Mitigado'
        AND NULLIF(a.prazo::text, '')::date < (now() AT TIME ZONE 'America/Sao_Paulo')::date
      ORDER BY NULLIF(a.prazo::text, '')::date ASC, a.id
    `;

    return NextResponse.json({ acoes });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar ações atrasadas." }, { status: 500 });
  }
}
