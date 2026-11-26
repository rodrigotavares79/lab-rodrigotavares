import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";
import { obterContadoresMenu } from "@/lib/indicadoresRiscos";
import { podeAprovarAceitacao } from "@/lib/perfisRiscos";
import { listarGruposDuplicados } from "@/lib/riscosDuplicados";
import { podeAprovarApetite } from "@/lib/perfisRiscos";
import { situacaoDoRisco } from "@/lib/apetiteRisco";
import { limitesVigentes } from "@/lib/apetiteServidor";

export const dynamic = "force-dynamic";

// Contadores do menu lateral do Gestão de Riscos: planos aguardando
// auditoria, ações com prazo vencido e riscos com revisão vencida.
export async function GET() {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const usuario = guarda.usuario;
    const [kpis, [semDono], [controlesNaoAvaliados], pendentes, vig, ativosApetite, [apetitePend], [krisVermelho]] = await Promise.all([
      obterContadoresMenu(sql),
      sql`SELECT COUNT(*)::int AS n FROM riscos WHERE dono_email IS NULL AND status <> 'Mitigado'`,
      sql`
        SELECT COUNT(*)::int AS n FROM riscos r
        WHERE r.status <> 'Mitigado' AND NOT r.sem_controles
          AND NOT EXISTS (SELECT 1 FROM fatores_risco f WHERE f.risco_id = r.id)
      `,
      sql`
        SELECT a.solicitado_por_email, r.impacto_qualitativo
        FROM aceitacoes_risco a JOIN riscos r ON r.id = a.risco_id
        WHERE a.situacao = 'Pendente'
      `,
      limitesVigentes(sql),
      sql`SELECT categoria, impacto_qualitativo, status FROM riscos WHERE status <> 'Mitigado'`,
      sql`SELECT proposto_por_email FROM apetite_versoes WHERE situacao = 'Pendente'`,
      // B21: KRIs ativos cuja medição mais recente está no vermelho.
      sql`
        SELECT COUNT(*)::int AS n FROM kris k
        WHERE k.ativo AND (SELECT m.faixa FROM kri_medicoes m WHERE m.kri_id = k.id ORDER BY m.referencia DESC LIMIT 1) = 'vermelho'
      `,
    ]);
    // B18: riscos ativos acima da tolerância da categoria; e a proposta de
    // apetite pendente conta só para quem pode decidi-la.
    const acimaTolerancia = ativosApetite.filter((r: any) => situacaoDoRisco(r, vig.mapa) === "acima_tolerancia").length;
    const apetitePendente =
      apetitePend &&
      podeAprovarApetite(usuario.perfil) &&
      String(apetitePend.proposto_por_email || "").toLowerCase() !== usuario.email.toLowerCase()
        ? 1
        : 0;
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
      // B15: riscos ativos sem controles informados nem declaração.
      controlesNaoAvaliados: controlesNaoAvaliados.n,
      acimaTolerancia,
      apetitePendente,
      krisVermelho: krisVermelho.n,
      // B19: grupos de riscos repetidos (só para quem pode consolidar).
      duplicados: usuario.permissoes.editarRiscos ? (await listarGruposDuplicados(sql)).length : 0,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar contadores do menu." }, { status: 500 });
  }
}
