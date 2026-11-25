import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { exigirPermissao, getUsuarioRiscos } from "@/lib/riscosAuth";
import { sincronizarStatusRisco } from "@/lib/sincronizarStatusRisco";

// GET: lista os Planos de Ação (container) de um risco, cada um já com a
// lista de Ações que tem dentro dele.
export async function GET(request: NextRequest) {
  try {
    const riscoId = request.nextUrl.searchParams.get("riscoId");
    if (!riscoId || !/^\d+$/.test(riscoId)) {
      return NextResponse.json({ error: "riscoId é obrigatório e deve ser numérico." }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });

    const planos = await sql`
      SELECT id, risco_id, titulo, status, criado_em, concluido_em, criado_por_nome,
             auditoria_status, auditado_em, auditado_por_nome, auditoria_comentario
      FROM planos_acao
      WHERE risco_id = ${riscoId}
      ORDER BY criado_em DESC
    `;

    if (planos.length === 0) {
      return NextResponse.json({ planos: [] });
    }

    const planoIds = planos.map((p: any) => p.id);
    const acoes = await sql`
      SELECT id, plano_acao_id, descricao, responsavel, responsavel_email, prazo, status, criado_em
      FROM acoes
      WHERE plano_acao_id = ANY(${planoIds})
      ORDER BY criado_em ASC
    `;

    const evidencias = await sql`
      SELECT id, plano_acao_id, descricao, nome_arquivo, tipo_arquivo, tamanho_bytes, enviado_por_nome, criado_em
      FROM planos_acao_evidencias
      WHERE plano_acao_id = ANY(${planoIds})
      ORDER BY criado_em ASC
    `;
    const evidenciasPorPlano = new Map<number, any[]>();
    for (const e of evidencias) {
      const lista = evidenciasPorPlano.get(e.plano_acao_id) || [];
      lista.push({ ...e, url: `/api/planos-acao/${e.plano_acao_id}/evidencias/${e.id}` });
      evidenciasPorPlano.set(e.plano_acao_id, lista);
    }

    const acoesPorPlano = new Map<number, any[]>();
    for (const a of acoes) {
      const lista = acoesPorPlano.get(a.plano_acao_id) || [];
      lista.push(a);
      acoesPorPlano.set(a.plano_acao_id, lista);
    }

    // Usuário comum não vê nenhuma informação de auditoria.
    const usuario = await getUsuarioRiscos();
    const verAuditoria = !!usuario?.permissoes.verAuditoria;

    const planosComAcoes = planos.map((p: any) => ({
      ...p,
      ...(verAuditoria
        ? {}
        : { auditoria_status: null, auditado_em: null, auditado_por_nome: null, auditoria_comentario: null }),
      acoes: acoesPorPlano.get(p.id) || [],
      evidencias: evidenciasPorPlano.get(p.id) || [],
    }));

    return NextResponse.json({ planos: planosComAcoes });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar planos de ação." }, { status: 500 });
  }
}

// POST: cria um novo Plano de Ação (container) para um risco. Bloqueado se o
// risco já estiver Mitigado — nesse estado, nada mais pode ser cadastrado.
// Um risco Identificado passa automaticamente para Em Tratamento.
export async function POST(request: NextRequest) {
  const guarda = await exigirPermissao("editarPlanos");
  if (guarda.resposta) return guarda.resposta;
  try {
    const body = await request.json();
    const { riscoId, titulo } = body ?? {};

    if (!riscoId) {
      return NextResponse.json({ error: "riscoId é obrigatório." }, { status: 400 });
    }
    if (!titulo || typeof titulo !== "string" || !titulo.trim()) {
      return NextResponse.json({ error: "Título do plano de ação é obrigatório." }, { status: 400 });
    }

    const sql = sqlAuditado(guarda.usuario);

    const riscoRows = await sql`SELECT id, status FROM riscos WHERE id = ${riscoId}`;
    if (riscoRows.length === 0) {
      return NextResponse.json({ error: "Risco não encontrado." }, { status: 404 });
    }
    if (riscoRows[0].status === "Mitigado") {
      return NextResponse.json(
        { error: "Este risco já foi mitigado. Não é possível cadastrar novo plano de ação." },
        { status: 409 }
      );
    }

    const rows = await sql`
      INSERT INTO planos_acao (risco_id, titulo, status, criado_por_email, criado_por_nome)
      VALUES (${riscoId}, ${titulo.trim()}, 'Aberto', ${guarda.usuario.email}, ${guarda.usuario.nome})
      RETURNING id, risco_id, titulo, status, criado_em
    `;

    const riscoStatus = await sincronizarStatusRisco(sql, riscoId);

    return NextResponse.json({ plano: { ...rows[0], acoes: [] }, riscoStatus });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno ao cadastrar o plano de ação." }, { status: 500 });
  }
}
