import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getUsuarioCondominio, podeGerirChamados, podeVisualizarAdmin } from "@/lib/condominioAuth";

export const dynamic = "force-dynamic";

const STATUS_VALIDOS = [
  "Novo",
  "Em andamento",
  "Aguardando fornecedor",
  "Paralisado",
  "Resolvido",
  "Reaberto",
  "Cancelado",
];

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const usuario = await getUsuarioCondominio();
    if (!usuario) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { id } = params;
    if (!id || !/^\d+$/.test(id)) {
      return NextResponse.json({ error: "ID de chamado inválido." }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const rows = await sql`
      SELECT c.id, c.titulo, c.descricao, c.urgencia, c.status, c.prazo_sla, c.global,
             c.justificativa_ultima_movimentacao, c.aberto_por_email, c.aberto_por_nome,
             c.aberto_por_unidade, c.criado_em, c.atualizado_em,
             c.tipo_id, s.nome AS servico,
             c.fornecedor_id, f.nome_fantasia AS fornecedor
      FROM chamados c
      LEFT JOIN catalogo_servicos s ON s.id = c.tipo_id
      LEFT JOIN fornecedores f ON f.id = c.fornecedor_id
      WHERE c.id = ${id}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Chamado não encontrado." }, { status: 404 });
    }
    const chamado = rows[0];

    const podeVer = podeVisualizarAdmin(usuario.perfil) || chamado.global || chamado.aberto_por_email === usuario.email;
    if (!podeVer) {
      return NextResponse.json({ error: "Você não tem acesso a este chamado." }, { status: 403 });
    }

    return NextResponse.json({ chamado, perfil: usuario.perfil });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar o chamado." }, { status: 500 });
  }
}

// Só Síndico/Conselheiro resolvem chamados. Toda mudança de status exige
// justificativa preenchida — mesma trava que existia no app original.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const usuario = await getUsuarioCondominio();
    if (!usuario || !podeGerirChamados(usuario.perfil)) {
      return NextResponse.json({ error: "Só o síndico ou conselheiro pode alterar um chamado." }, { status: 403 });
    }

    const { id } = params;
    if (!id || !/^\d+$/.test(id)) {
      return NextResponse.json({ error: "ID de chamado inválido." }, { status: 400 });
    }

    const body = await request.json();
    const { status, fornecedorId, global: isGlobal, justificativa } = body ?? {};

    if (status !== undefined && !STATUS_VALIDOS.includes(status)) {
      return NextResponse.json({ error: `Status inválido. Use um de: ${STATUS_VALIDOS.join(", ")}.` }, { status: 400 });
    }
    if (status !== undefined && (!justificativa || !String(justificativa).trim())) {
      return NextResponse.json({ error: "Justificativa é obrigatória para mudar o status." }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });

    const atualRows = await sql`SELECT status, fornecedor_id, global FROM chamados WHERE id = ${id}`;
    if (atualRows.length === 0) {
      return NextResponse.json({ error: "Chamado não encontrado." }, { status: 404 });
    }
    const atual = atualRows[0];

    const novoStatus = status ?? atual.status;
    const novoFornecedorId = fornecedorId !== undefined ? fornecedorId : atual.fornecedor_id;
    const novoGlobal = isGlobal !== undefined ? Boolean(isGlobal) : atual.global;
    const novaJustificativa = justificativa !== undefined ? justificativa : null;

    await sql`
      UPDATE chamados
      SET status = ${novoStatus},
          fornecedor_id = ${novoFornecedorId},
          global = ${novoGlobal},
          justificativa_ultima_movimentacao = COALESCE(${novaJustificativa}, justificativa_ultima_movimentacao),
          atualizado_em = now()
      WHERE id = ${id}
    `;

    // Cada atualização vira uma linha nova no histórico — não sobrescreve a
    // anterior, diferente do campo justificativa_ultima_movimentacao.
    await sql`
      INSERT INTO chamados_historico (
        chamado_id, status_anterior, status_novo, justificativa, fornecedor_id, global, autor_email, autor_nome
      ) VALUES (
        ${id}, ${atual.status}, ${novoStatus}, ${novaJustificativa}, ${novoFornecedorId}, ${novoGlobal}, ${usuario.email}, ${usuario.nome}
      )
    `;

    const rows = await sql`SELECT id, status, fornecedor_id, global FROM chamados WHERE id = ${id}`;
    return NextResponse.json({ chamado: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno ao atualizar o chamado." }, { status: 500 });
  }
}
