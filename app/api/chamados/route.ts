import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getUsuarioCondominio, podeVisualizarAdmin } from "@/lib/condominioAuth";

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
                 c.aberto_por_nome, c.aberto_por_unidade, c.criado_em,
                 t.nome AS tipo, f.nome_fantasia AS fornecedor
          FROM chamados c
          LEFT JOIN tipos_chamado t ON t.id = c.tipo_id
          LEFT JOIN fornecedores f ON f.id = c.fornecedor_id
          ORDER BY c.criado_em DESC
        `
      : await sql`
          SELECT c.id, c.titulo, c.status, c.urgencia, c.prazo_sla, c.global,
                 c.aberto_por_nome, c.aberto_por_unidade, c.criado_em,
                 t.nome AS tipo, f.nome_fantasia AS fornecedor
          FROM chamados c
          LEFT JOIN tipos_chamado t ON t.id = c.tipo_id
          LEFT JOIN fornecedores f ON f.id = c.fornecedor_id
          WHERE c.aberto_por_email = ${usuario.email} OR c.global = true
          ORDER BY c.criado_em DESC
        `;

    return NextResponse.json({ chamados: rows, perfil: usuario.perfil });
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

    const { titulo, descricao, tipoId, urgencia } = await request.json();
    if (!titulo || typeof titulo !== "string") {
      return NextResponse.json({ error: "Título é obrigatório." }, { status: 400 });
    }
    if (!tipoId) {
      return NextResponse.json({ error: "Tipo de chamado é obrigatório." }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });

    const tipoRows = await sql`SELECT sla_horas FROM tipos_chamado WHERE id = ${tipoId}`;
    if (tipoRows.length === 0) {
      return NextResponse.json({ error: "Tipo de chamado não encontrado." }, { status: 404 });
    }
    const slaHoras = tipoRows[0].sla_horas;

    // Prazo SLA = agora + SLA (horas) do tipo escolhido — mesma regra
    // automática que existia no app original.
    const rows = await sql`
      INSERT INTO chamados (
        titulo, descricao, tipo_id, urgencia, status, prazo_sla,
        aberto_por_email, aberto_por_nome, aberto_por_unidade
      ) VALUES (
        ${titulo}, ${descricao || null}, ${tipoId}, ${urgencia || null}, 'Novo',
        now() + make_interval(hours => ${slaHoras}),
        ${usuario.email}, ${usuario.nome}, ${usuario.unidade}
      )
      RETURNING id
    `;

    return NextResponse.json({ ok: true, id: rows[0].id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao abrir o chamado." }, { status: 500 });
  }
}
