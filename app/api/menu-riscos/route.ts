import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getUsuarioRiscos } from "@/lib/riscosAuth";
import { obterContadoresMenu } from "@/lib/indicadoresRiscos";

export const dynamic = "force-dynamic";

// Contadores do menu lateral do Gestão de Riscos: planos aguardando
// auditoria e ações com prazo vencido.
export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const kpis = await obterContadoresMenu(sql);
    const usuario = await getUsuarioRiscos();
    return NextResponse.json({
      // Usuário comum não vê nada de auditoria, nem a contagem.
      auditoriaPendentes: usuario?.permissoes.verAuditoria ? kpis.auditoriaPendentes : 0,
      acoesAtrasadas: kpis.acoesAtrasadas,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar contadores do menu." }, { status: 500 });
  }
}
