import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

// Contadores do menu lateral do Gestão de Riscos: planos aguardando
// auditoria e ações com prazo vencido.
export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const [[auditoria], [acoes]] = await Promise.all([
      sql`SELECT COUNT(*)::int AS pendentes FROM planos_acao WHERE auditoria_status = 'Pendente'`,
      sql`
        SELECT COUNT(*)::int AS atrasadas
        FROM acoes
        WHERE status IS DISTINCT FROM 'Concluído'
          AND NULLIF(prazo::text, '')::date < CURRENT_DATE
      `,
    ]);
    return NextResponse.json({
      auditoriaPendentes: auditoria.pendentes,
      acoesAtrasadas: acoes.atrasadas,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar contadores do menu." }, { status: 500 });
  }
}
