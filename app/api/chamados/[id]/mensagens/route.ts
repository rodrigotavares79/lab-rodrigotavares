import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getUsuarioCondominio, podeGerirChamados, podeVisualizarAdmin } from "@/lib/condominioAuth";
import { emVisaoRestrita, emailsDaAdministracao, nomeVisivel } from "@/lib/condominioPrivacidade";

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

    // Só quem pode ver o chamado lê ou escreve mensagens nele — mesma regra
    // da tela do chamado, do histórico e dos anexos.
    const chamadoRows = await sql`SELECT aberto_por_email, global FROM chamados WHERE id = ${id}`;
    if (chamadoRows.length === 0) {
      return NextResponse.json({ error: "Chamado não encontrado." }, { status: 404 });
    }
    const chamado = chamadoRows[0];
    const podeVer = podeVisualizarAdmin(usuario.perfil) || chamado.global || chamado.aberto_por_email === usuario.email;
    if (!podeVer) {
      return NextResponse.json({ error: "Você não tem acesso a este chamado." }, { status: 403 });
    }

    const vePrivadas = podeVisualizarAdmin(usuario.perfil);

    // Condômino só vê mensagens marcadas como visíveis a ele — notas
    // internas do síndico/conselheiro/conselheiro-admin ficam de fora.
    const rows = vePrivadas
      ? await sql`
          SELECT id, autor_nome, texto, visivel_condomino, criado_em
          FROM mensagens WHERE chamado_id = ${id} ORDER BY criado_em ASC
        `
      : await sql`
          SELECT id, autor_email, autor_nome, texto, visivel_condomino, criado_em
          FROM mensagens WHERE chamado_id = ${id} AND visivel_condomino = true
          ORDER BY criado_em ASC
        `;

    if (vePrivadas) {
      return NextResponse.json({ mensagens: rows });
    }

    // Condômino: o e-mail do autor nunca sai da API. Em chamado global de
    // outra pessoa, moradores aparecem como "Morador"; a administração e o
    // próprio usuário continuam identificados pelo nome.
    const restrita = emVisaoRestrita(usuario, chamado);
    const administracao = restrita ? await emailsDaAdministracao(rows.map((m) => m.autor_email)) : new Set<string>();
    const mensagens = rows.map(({ autor_email, ...m }) => ({
      ...m,
      autor_nome: restrita ? nomeVisivel(autor_email, m.autor_nome, usuario, administracao) : m.autor_nome,
    }));

    return NextResponse.json({ mensagens });
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

    // Só quem pode ver o chamado lê ou escreve mensagens nele — mesma regra
    // da tela do chamado, do histórico e dos anexos.
    const chamadoRows = await sql`SELECT aberto_por_email, global FROM chamados WHERE id = ${id}`;
    if (chamadoRows.length === 0) {
      return NextResponse.json({ error: "Chamado não encontrado." }, { status: 404 });
    }
    const chamado = chamadoRows[0];
    const podeVer = podeVisualizarAdmin(usuario.perfil) || chamado.global || chamado.aberto_por_email === usuario.email;
    if (!podeVer) {
      return NextResponse.json({ error: "Você não tem acesso a este chamado." }, { status: 403 });
    }

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
