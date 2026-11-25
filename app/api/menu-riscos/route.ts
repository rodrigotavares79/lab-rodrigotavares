import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";
import { obterContadoresMenu } from "@/lib/indicadoresRiscos";
import { podeAprovarAceitacao } from "@/lib/perfisRiscos";
import { listarGruposDuplicados } from "@/lib/riscosDuplicados";

export const dynamic = "force-dynamic";

// Contadores do menu lateral do Gestão de Riscos: planos aguardando
// auditoria, ações com prazo vencido e riscos com revisão vencida.
export async function GET() {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const usuario = guarda.usuario;
    const [kpis, [semDono], pendentes] = await Promise.all([
      obterContadoresMenu(sql),
      sql`SELECT COUNT(*)::int AS n FROM riscos WHERE dono_email IS NULL AND status <> 'Mitigado'`,
      sql`
        SELECT a.solicitado_por_email, r.impacto_qualitativo
        FROM aceitacoes_risco a JOIN riscos r ON r.id = a.risco_id
        WHERE a.situacao = 'Pendente'
      `,
    ]);
    // B16: conta só as aceitações que este usuário pode decidir (tem alçada
    // para o nível atual e não foi quem pediu).
    const aceitacoesPendentes = pendentes.filter(
      (p: any) =>
        podeAprovarAceitacao(usuario.perfil, p.impacto_qualitativo) &&
        String(p.solicitado_por_email || "").toLowerCase() !== usuario.email.toLowerCase()
    ).length;
    return NextResponse.json({
      // Usuário comum não vê nada de auditoria, nem a contagem.
      auditoriaPendentes: usuario?.permissoes.verAuditoria ? kpis.auditoriaPendentes : 0,
      acoesAtrasadas: kpis.acoesAtrasadas,
      revisoesVencidas: kpis.revisoesVencidas,
      semTratamento: kpis.semTratamento,
      aceitacoesPendentes,
      semDono: semDono.n,
      // B19: grupos de riscos repetidos (só para quem pode consolidar).
      duplicados: usuario.permissoes.editarRiscos ? (await listarGruposDuplicados(sql)).length : 0,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar contadores do menu." }, { status: 500 });
  }
}
