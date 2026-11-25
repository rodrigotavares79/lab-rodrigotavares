import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao, ROTULO_PERFIL_RISCOS } from "@/lib/riscosAuth";
import { urlDaEvidencia } from "@/lib/riscosEvidencias";
import { motivoConflitoAuditoria } from "@/lib/segregacaoFuncoes";

export const dynamic = "force-dynamic";

const FILTROS = ["Pendente", "Conforme", "Não conforme"];

// GET ?status=Pendente|Conforme|Não conforme
// Planos de ação na Auditoria, com o risco, as ações, as evidências e o
// histórico de decisões. Também devolve as contagens por situação e se o
// usuário logado pode auditar.
export async function GET(request: NextRequest) {
  try {
    const guarda = await exigirPermissao("verAuditoria");
    if (guarda.resposta) return guarda.resposta;
    const usuario = guarda.usuario;

    const filtro = request.nextUrl.searchParams.get("status") || "Pendente";
    if (!FILTROS.includes(filtro)) {
      return NextResponse.json({ error: "Filtro inválido." }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });

    const [contagem] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE auditoria_status = 'Pendente')::int AS pendentes,
        COUNT(*) FILTER (WHERE auditoria_status = 'Conforme')::int AS conformes,
        COUNT(*) FILTER (WHERE auditoria_status = 'Não conforme')::int AS nao_conformes
      FROM planos_acao
    `;

    const planos = await sql`
      SELECT
        pa.id, pa.titulo, pa.status, pa.concluido_em, pa.auditoria_status,
        pa.criado_por_email, pa.criado_por_nome,
        pa.auditado_em, pa.auditado_por_nome, pa.auditoria_comentario,
        r.id AS risco_id, r.gatilho, r.titulo AS risco_titulo, r.categoria, r.impacto_qualitativo, r.status AS risco_status,
        p.nome AS projeto
      FROM planos_acao pa
      JOIN riscos r ON r.id = pa.risco_id
      LEFT JOIN projetos p ON p.id = r.projeto_id
      WHERE pa.auditoria_status = ${filtro}
      ORDER BY
        CASE WHEN ${filtro} = 'Pendente' THEN pa.concluido_em END ASC NULLS LAST,
        pa.auditado_em DESC NULLS LAST,
        pa.id DESC
      LIMIT 200
    `;

    const ids = planos.map((p: any) => p.id);
    const [acoes, evidencias, historico] = ids.length
      ? await Promise.all([
          sql`SELECT id, plano_acao_id, descricao, responsavel, responsavel_email, prazo, status
              FROM acoes WHERE plano_acao_id = ANY(${ids}) ORDER BY criado_em ASC`,
          sql`SELECT id, plano_acao_id, descricao, nome_arquivo, tipo_arquivo, tamanho_bytes, enviado_por_nome, criado_em, sha256
              FROM planos_acao_evidencias WHERE plano_acao_id = ANY(${ids}) ORDER BY criado_em ASC`,
          sql`SELECT id, plano_acao_id, resultado, comentario, auditor_nome, criado_em
              FROM planos_acao_auditorias WHERE plano_acao_id = ANY(${ids}) ORDER BY criado_em DESC`,
        ])
      : [[], [], []];

    const agrupar = (lista: any[]) => {
      const m = new Map<number, any[]>();
      for (const item of lista) {
        const l = m.get(item.plano_acao_id) || [];
        l.push(item);
        m.set(item.plano_acao_id, l);
      }
      return m;
    };
    const acoesPor = agrupar(acoes);
    const evidPor = agrupar(evidencias.map((e: any) => ({ ...e, url: urlDaEvidencia(e.plano_acao_id, e.id) })));
    const histPor = agrupar(historico);

    return NextResponse.json({
      usuario: {
        nome: usuario.nome,
        podeAuditar: usuario.podeAuditar,
        perfil: ROTULO_PERFIL_RISCOS[usuario.perfil],
      },
      contagem,
      planos: planos.map(({ criado_por_email, ...p }: any) => ({
        ...p,
        // B07: motivo que impede o usuário logado de auditar este plano.
        conflito:
          p.auditoria_status === "Pendente"
            ? motivoConflitoAuditoria({
                auditorEmail: usuario.email,
                criadoPorEmail: criado_por_email,
                acoes: acoesPor.get(p.id) || [],
              })
            : null,
        acoes: acoesPor.get(p.id) || [],
        evidencias: evidPor.get(p.id) || [],
        historico: histPor.get(p.id) || [],
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao carregar a auditoria." }, { status: 500 });
  }
}
