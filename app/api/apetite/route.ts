import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { podeAprovarApetite } from "@/lib/perfisRiscos";
import { situacaoDoRisco, validarProposta, type LimiteCategoria, type SituacaoApetite } from "@/lib/apetiteRisco";
import { limitesVigentes } from "@/lib/apetiteServidor";

export const dynamic = "force-dynamic";

// B18 · GET: versões (vigente, pendente e histórico) com os limites de cada
// uma, as categorias em uso e, por categoria, quantos riscos ativos estão
// dentro do apetite, acima do apetite e acima da tolerância.
export async function GET() {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const [versoes, limites, riscos, vig] = await Promise.all([
      sql`
        SELECT id, versao, situacao, justificativa, proposto_por_email, proposto_por_nome, proposto_em,
               decidido_por_nome, decidido_por_perfil, decidido_em, motivo_decisao, vigente_desde, vigente_ate
        FROM apetite_versoes ORDER BY versao DESC
      `,
      sql`SELECT versao_id, categoria, apetite, tolerancia FROM apetite_limites ORDER BY categoria`,
      sql`SELECT categoria, impacto_qualitativo, status FROM riscos WHERE status <> 'Mitigado'`,
      limitesVigentes(sql),
    ]);
    const porVersao = new Map<number, LimiteCategoria[]>();
    for (const l of limites as any[]) {
      const lista = porVersao.get(l.versao_id) ?? [];
      lista.push({ categoria: l.categoria, apetite: l.apetite, tolerancia: l.tolerancia });
      porVersao.set(l.versao_id, lista);
    }
    const resumo: Record<string, Record<SituacaoApetite, number>> = {};
    for (const r of riscos as any[]) {
      const cat = r.categoria || "Sem categoria";
      resumo[cat] ??= { dentro: 0, acima_apetite: 0, acima_tolerancia: 0, sem_referencia: 0 };
      resumo[cat][situacaoDoRisco(r, vig.mapa)]++;
    }
    const usuario = guarda.usuario;
    return NextResponse.json({
      versoes: (versoes as any[]).map((v) => ({ ...v, limites: porVersao.get(v.id) ?? [] })),
      categorias: Object.keys(resumo).sort((a, b) => a.localeCompare(b, "pt-BR")),
      resumo,
      podePropor: usuario.permissoes.editarRiscos,
      podeDecidir: podeAprovarApetite(usuario.perfil),
      eu: usuario.email,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar o apetite a risco." }, { status: 500 });
  }
}

// B18 · POST { justificativa, limites: [{ categoria, apetite, tolerancia }] }
// Registra uma nova versão Pendente. Só cabe uma pendente por vez.
export async function POST(request: NextRequest) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  try {
    const body = await request.json().catch(() => ({}));
    const invalida = validarProposta(body ?? {});
    if (invalida) return NextResponse.json({ error: invalida }, { status: 400 });
    const limites = (body.limites as LimiteCategoria[]).map((l) => ({
      categoria: String(l.categoria).trim().slice(0, 120),
      apetite: l.apetite,
      tolerancia: l.tolerancia,
    }));
    const sql = sqlAuditado(guarda.usuario);
    const [pendente] = await sql`SELECT versao FROM apetite_versoes WHERE situacao = 'Pendente'`;
    if (pendente) {
      return NextResponse.json(
        { error: `Já existe a versão ${pendente.versao} aguardando aprovação. Decida-a antes de propor outra.` },
        { status: 409 }
      );
    }
    const [nova] = await sql`
      WITH v AS (
        INSERT INTO apetite_versoes (versao, justificativa, proposto_por_email, proposto_por_nome)
        SELECT COALESCE(MAX(versao), 0) + 1, ${String(body.justificativa).trim().slice(0, 4000)},
               ${guarda.usuario.email}, ${guarda.usuario.nome}
        FROM apetite_versoes
        RETURNING id, versao
      ), l AS (
        INSERT INTO apetite_limites (versao_id, categoria, apetite, tolerancia)
        SELECT v.id, x.categoria, x.apetite, x.tolerancia
        FROM v, jsonb_to_recordset(${JSON.stringify(limites)}::jsonb) AS x(categoria text, apetite text, tolerancia text)
        RETURNING 1
      )
      SELECT v.id, v.versao, (SELECT COUNT(*) FROM l)::int AS limites FROM v
    `;
    return NextResponse.json({ versao: nova }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao registrar a proposta." }, { status: 500 });
  }
}
