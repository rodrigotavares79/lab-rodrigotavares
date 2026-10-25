import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getUsuarioCondominio, podeVisualizarAdmin } from "@/lib/condominioAuth";

export const dynamic = "force-dynamic";

// Linha do tempo completa do chamado — quem vê o chamado vê o histórico
// inteiro dele (não tem distinção de nota interna aqui, diferente de
// mensagens).
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

    const chamadoRows = await sql`SELECT aberto_por_email, global FROM chamados WHERE id = ${id}`;
    if (chamadoRows.length === 0) {
      return NextResponse.json({ error: "Chamado não encontrado." }, { status: 404 });
    }
    const chamado = chamadoRows[0];
    const podeVer = podeVisualizarAdmin(usuario.perfil) || chamado.global || chamado.aberto_por_email === usuario.email;
    if (!podeVer) {
      return NextResponse.json({ error: "Você não tem acesso a este chamado." }, { status: 403 });
    }

    const historico = await sql`
      SELECT h.id, h.status_anterior, h.status_novo, h.justificativa, h.global,
             h.autor_nome, h.criado_em, f.nome_fantasia AS fornecedor
      FROM chamados_historico h
      LEFT JOIN fornecedores f ON f.id = h.fornecedor_id
      WHERE h.chamado_id = ${id}
      ORDER BY h.criado_em DESC
    `;

    return NextResponse.json({ historico });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar o histórico." }, { status: 500 });
  }
}
