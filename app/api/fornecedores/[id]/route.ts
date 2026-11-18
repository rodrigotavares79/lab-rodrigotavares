import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getUsuarioCondominio, podeGerirChamados } from "@/lib/condominioAuth";

export const dynamic = "force-dynamic";

// Edita os dados de um fornecedor e/ou o ativa/desativa. Fornecedor nunca é
// apagado: desativado, ele some da escolha de fornecedor nos chamados, mas
// continua nos chamados antigos e no histórico.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const usuario = await getUsuarioCondominio();
    if (!usuario || !podeGerirChamados(usuario.perfil)) {
      return NextResponse.json({ error: "Só o síndico ou conselheiro pode alterar fornecedores." }, { status: 403 });
    }
    const { id } = params;
    if (!/^\d+$/.test(id ?? "")) {
      return NextResponse.json({ error: "Fornecedor inválido." }, { status: 400 });
    }

    const body = (await request.json()) ?? {};
    const campos = ["nomeFantasia", "cnpj", "categoriaServico", "nomeContato", "email", "telefone"] as const;
    const editandoDados = campos.some((c) => body[c] !== undefined);
    if (editandoDados && (!body.nomeFantasia || typeof body.nomeFantasia !== "string" || !body.nomeFantasia.trim())) {
      return NextResponse.json({ error: "Nome fantasia é obrigatório." }, { status: 400 });
    }
    const ativo: boolean | null = body.ativo !== undefined ? Boolean(body.ativo) : null;
    const texto = (v: unknown) => (v === undefined ? null : String(v ?? "").trim() || null);

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const rows = await sql`
      UPDATE fornecedores SET
        nome_fantasia     = CASE WHEN ${editandoDados}::boolean THEN ${texto(body.nomeFantasia)}::text ELSE nome_fantasia END,
        cnpj              = CASE WHEN ${editandoDados}::boolean THEN ${texto(body.cnpj)}::text ELSE cnpj END,
        categoria_servico = CASE WHEN ${editandoDados}::boolean THEN ${texto(body.categoriaServico)}::text ELSE categoria_servico END,
        nome_contato      = CASE WHEN ${editandoDados}::boolean THEN ${texto(body.nomeContato)}::text ELSE nome_contato END,
        email             = CASE WHEN ${editandoDados}::boolean THEN ${texto(body.email)}::text ELSE email END,
        telefone          = CASE WHEN ${editandoDados}::boolean THEN ${texto(body.telefone)}::text ELSE telefone END,
        ativo             = COALESCE(${ativo}::boolean, ativo),
        atualizado_em     = now(),
        atualizado_por    = ${usuario.email}
      WHERE id = ${id}
      RETURNING id, nome_fantasia, cnpj, categoria_servico, nome_contato, email, telefone, ativo, criado_em
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: "Fornecedor não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ fornecedor: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao atualizar o fornecedor." }, { status: 500 });
  }
}
