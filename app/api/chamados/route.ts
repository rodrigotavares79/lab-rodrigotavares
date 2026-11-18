import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getUsuarioCondominio, podeVisualizarAdmin } from "@/lib/condominioAuth";
import { mascararAutorDoChamado } from "@/lib/condominioPrivacidade";

export const dynamic = "force-dynamic";

// Síndico/Conselheiro/Conselheiro-Admin veem todos os chamados (os dois
// primeiros podem resolver; o conselheiro-admin só visualiza). Condômino vê
// só os que ele mesmo abriu, mais os marcados como "Global (visível a
// todos)" — mesma regra do app original no Bubble.
export async function GET() {
  try {
    const usuario = await getUsuarioCondominio();
    if (!usuario) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const gerente = podeVisualizarAdmin(usuario.perfil);

    const rows = gerente
      ? await sql`
          SELECT c.id, c.titulo, c.status, c.urgencia, c.prazo_sla, c.global,
                 c.aberto_por_nome, c.aberto_por_unidade, c.criado_em, c.descricao,
                 s.nome AS servico, f.nome_fantasia AS fornecedor
          FROM chamados c
          LEFT JOIN catalogo_servicos s ON s.id = c.tipo_id
          LEFT JOIN fornecedores f ON f.id = c.fornecedor_id
          ORDER BY c.criado_em DESC
        `
      : await sql`
          SELECT c.id, c.titulo, c.status, c.urgencia, c.prazo_sla, c.global,
                 c.aberto_por_nome, c.aberto_por_unidade, c.aberto_por_email, c.criado_em, c.descricao,
                 s.nome AS servico, f.nome_fantasia AS fornecedor
          FROM chamados c
          LEFT JOIN catalogo_servicos s ON s.id = c.tipo_id
          LEFT JOIN fornecedores f ON f.id = c.fornecedor_id
          WHERE c.aberto_por_email = ${usuario.email} OR c.global = true
          ORDER BY c.criado_em DESC
        `;

    // Condômino: nos chamados globais abertos por outra pessoa, o autor
    // aparece só como "Morador" (sem nome nem unidade).
    const chamados = gerente
      ? rows
      : rows.map((c) => {
          const { aberto_por_email, ...resto } = c;
          return aberto_por_email === usuario.email ? resto : mascararAutorDoChamado(resto);
        });

    return NextResponse.json({ chamados, perfil: usuario.perfil });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar chamados." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioCondominio();
    if (!usuario) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { titulo, descricao, servicoId } = await request.json();
    if (!titulo || typeof titulo !== "string") {
      return NextResponse.json({ error: "Título é obrigatório." }, { status: 400 });
    }
    if (!servicoId) {
      return NextResponse.json({ error: "Serviço é obrigatório." }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });

    // Urgência não é mais escolhida pelo condômino — vem fixa do serviço
    // selecionado no Catálogo de Serviços, junto com o SLA.
    const servicoRows = await sql`SELECT sla_horas, urgencia FROM catalogo_servicos WHERE id = ${servicoId}`;
    if (servicoRows.length === 0) {
      return NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 });
    }
    const { sla_horas: slaHoras, urgencia } = servicoRows[0];

    // Prazo SLA = agora + SLA (horas) do serviço escolhido — mesma regra
    // automática que existia no app original.
    // Abertura e primeira linha do histórico numa única instrução SQL: ou
    // as duas gravações acontecem, ou nenhuma — o chamado nunca fica sem o
    // registro de abertura na linha do tempo.
    const rows = await sql`
      WITH novo AS (
        INSERT INTO chamados (
          titulo, descricao, tipo_id, urgencia, status, prazo_sla,
          aberto_por_email, aberto_por_nome, aberto_por_unidade
        ) VALUES (
          ${titulo}, ${descricao || null}, ${servicoId}, ${urgencia || null}, 'Novo',
          now() + make_interval(hours => ${slaHoras}),
          ${usuario.email}, ${usuario.nome}, ${usuario.unidade}
        )
        RETURNING id
      )
      INSERT INTO chamados_historico (chamado_id, status_anterior, status_novo, autor_email, autor_nome)
      SELECT id, NULL, 'Novo', ${usuario.email}, ${usuario.nome} FROM novo
      RETURNING chamado_id AS id
    `;

    const chamadoId = rows[0].id;

    return NextResponse.json({ ok: true, id: chamadoId });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao abrir o chamado." }, { status: 500 });
  }
}
