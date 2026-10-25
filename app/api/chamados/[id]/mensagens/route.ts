import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getUsuarioCondominio, podeGerirChamados } from "@/lib/condominioAuth";

export const dynamic = "force-dynamic";

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
    const gerente = podeGerirChamados(usuario.perfil);

    // Condômino só vê mensagens marcadas como visíveis a ele — notas
    // internas do síndico/conselheiro ficam de fora.
    const rows = gerente
      ? await sql`
          SELECT id, autor_nome, texto, visivel_condomino, criado_em
          FROM mensagens WHERE chamado_id = ${id} ORDER BY criado_em ASC
        `
      : await sql`
          SELECT id, autor_nome, texto, visivel_condomino, criado_em
          FROM mensagens WHERE chamado_id = ${id} AND visivel_condomino = true
          ORDER BY criado_em ASC
        `;

    return NextResponse.json({ mensagens: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar mensagens." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const usuario = await getUsuarioCondominio();
    if (!usuario) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { id } = params;
    if (!id || !/^\d+$/.test(id)) {
      return NextResponse.json({ error: "ID de chamado inválido." }, { status: 400 });
    }

    const { texto, visivelCondomino } = await request.json();
    if (!texto || !String(texto).trim()) {
      return NextResponse.json({ error: "Mensagem não pode ficar vazia." }, { status: 400 });
    }

    const gerente = podeGerirChamados(usuario.perfil);
    // Condômino nunca escreve nota interna — toda mensagem dele é visível.
    const visivel = gerente ? Boolean(visivelCondomino) : true;

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const rows = await sql`
      INSERT INTO mensagens (chamado_id, autor_email, autor_nome, texto, visivel_condomino)
      VALUES (${id}, ${usuario.email}, ${usuario.nome}, ${texto}, ${visivel})
      RETURNING id, autor_nome, texto, visivel_condomino, criado_em
    `;

    return NextResponse.json({ mensagem: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao enviar a mensagem." }, { status: 500 });
  }
}
