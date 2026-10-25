import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getUsuarioCondominio } from "@/lib/condominioAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const rows = await sql`
      SELECT id, nome_fantasia, cnpj, categoria_servico, nome_contato, email, telefone, criado_em
      FROM fornecedores ORDER BY nome_fantasia ASC
    `;
    return NextResponse.json({ fornecedores: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar fornecedores." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioCondominio();
    if (!usuario) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { nomeFantasia, cnpj, categoriaServico, nomeContato, email, telefone } = await request.json();
    if (!nomeFantasia || typeof nomeFantasia !== "string") {
      return NextResponse.json({ error: "Nome fantasia é obrigatório." }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const rows = await sql`
      INSERT INTO fornecedores (nome_fantasia, cnpj, categoria_servico, nome_contato, email, telefone, cadastrado_por)
      VALUES (${nomeFantasia}, ${cnpj || null}, ${categoriaServico || null}, ${nomeContato || null}, ${email || null}, ${telefone || null}, ${usuario.email})
      RETURNING id, nome_fantasia, cnpj, categoria_servico, nome_contato, email, telefone, criado_em
    `;
    return NextResponse.json({ fornecedor: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao cadastrar fornecedor." }, { status: 500 });
  }
}
