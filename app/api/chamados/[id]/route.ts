import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getUsuarioCondominio, podeGerirChamados, podeVisualizarAdmin } from "@/lib/condominioAuth";
import { enviarAvisoMudancaStatusChamado } from "@/lib/condominioEmail";
import { emVisaoRestrita, mascararAutorDoChamado } from "@/lib/condominioPrivacidade";

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

    // Chamado global visto por outro condômino: sem nome, unidade ou e-mail
    // de quem abriu.
    const chamadoVisivel = emVisaoRestrita(usuario, chamado) ? mascararAutorDoChamado(chamado) : chamado;

    return NextResponse.json({ chamado: chamadoVisivel, perfil: usuario.perfil });
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

    // fornecedorId: undefined = manter; null/"" = remover; número = trocar.
    const fornecedorDefinido = fornecedorId !== undefined;
    const fornecedorParam =
      fornecedorDefinido && fornecedorId !== null && fornecedorId !== "" ? Number(fornecedorId) : null;
    if (fornecedorParam !== null && !Number.isInteger(fornecedorParam)) {
      return NextResponse.json({ error: "Fornecedor inválido." }, { status: 400 });
    }
    const statusParam: string | null = status ?? null;
    const globalParam: boolean | null = isGlobal !== undefined ? Boolean(isGlobal) : null;
    const justificativaParam: string | null =
      justificativa !== undefined && justificativa !== null ? String(justificativa) : null;

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });

    // Leitura do estado atual, atualização e linha do histórico numa única
    // instrução SQL (atômica): se qualquer parte falhar, nada é gravado, e o
    // FOR UPDATE impede que duas movimentações simultâneas se atropelem.
    let rows: Record<string, any>[];
    try {
      rows = await sql`
        WITH atual AS (
          SELECT id, status, fornecedor_id, global, titulo, aberto_por_email, aberto_por_nome
          FROM chamados WHERE id = ${id}
          FOR UPDATE
        ),
        upd AS (
          UPDATE chamados c
          SET status = COALESCE(${statusParam}::text, a.status),
              fornecedor_id = CASE WHEN ${fornecedorDefinido}::boolean THEN ${fornecedorParam}::int ELSE a.fornecedor_id END,
              global = COALESCE(${globalParam}::boolean, a.global),
              justificativa_ultima_movimentacao = COALESCE(${justificativaParam}::text, c.justificativa_ultima_movimentacao),
              atualizado_em = now()
          FROM atual a
          WHERE c.id = a.id
          RETURNING c.id, c.status, c.fornecedor_id, c.global,
                    a.status AS status_anterior, a.titulo, a.aberto_por_email, a.aberto_por_nome
        ),
        hist AS (
          INSERT INTO chamados_historico (
            chamado_id, status_anterior, status_novo, justificativa, fornecedor_id, global, autor_email, autor_nome
          )
          SELECT id, status_anterior, status, ${justificativaParam}::text, fornecedor_id, global,
                 ${usuario.email}, ${usuario.nome}
          FROM upd
        )
        SELECT * FROM upd
      `;
    } catch (err) {
      // 23503 = violação de chave estrangeira (fornecedor inexistente).
      if ((err as { code?: string })?.code === "23503") {
        return NextResponse.json({ error: "Fornecedor não encontrado." }, { status: 400 });
      }
      throw err;
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "Chamado não encontrado." }, { status: 404 });
    }
    const resultado = rows[0];
    const atual = {
      status: resultado.status_anterior,
      titulo: resultado.titulo,
      aberto_por_email: resultado.aberto_por_email,
      aberto_por_nome: resultado.aberto_por_nome,
    };
    const novoStatus = resultado.status;
    const novaJustificativa = justificativaParam;

    // Avisa o condômino que abriu o chamado só quando o status realmente
    // muda — não a cada edição de fornecedor/visibilidade. Falha de e-mail
    // não deve quebrar a resposta da API.
    if (status !== undefined && status !== atual.status) {
      try {
        await enviarAvisoMudancaStatusChamado(
          atual.aberto_por_email,
          atual.aberto_por_nome || atual.aberto_por_email,
          Number(id),
          atual.titulo,
          novoStatus,
          novaJustificativa
        );
      } catch (err) {
        console.error("Falha ao notificar condômino sobre mudança de status:", err);
      }
    }

    return NextResponse.json({
      chamado: { id: resultado.id, status: resultado.status, fornecedor_id: resultado.fornecedor_id, global: resultado.global },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno ao atualizar o chamado." }, { status: 500 });
  }
}
