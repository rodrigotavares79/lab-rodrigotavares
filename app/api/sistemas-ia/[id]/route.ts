import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { TIPOS } from "@/lib/inventarioIAConstants";

export const dynamic = "force-dynamic";

function emailsValidos(emails: string): boolean {
  return emails
    .split(";")
    .map((e) => e.trim())
    .filter(Boolean)
    .every((e) => e.includes("@"));
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id || !/^\d+$/.test(id)) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    const rows = await sql`
      SELECT
        id, sistema, tipo, descricao, area, area_usuario, usuarios, emails,
        dados_tratados, parecer_aprovado, parecer_numero_chamado, criado_em
      FROM sistemas_ia
      WHERE id = ${id}
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: "Sistema não encontrado." }, { status: 404 });
    }

    const revisoes = await sql`
      SELECT id, sistema_ia_id, revisado_por, data_revisao, numero_chamado, parecer_aprovado, criado_em
      FROM revisoes_sistemas_ia
      WHERE sistema_ia_id = ${id}
      ORDER BY data_revisao DESC, id DESC
    `;

    return NextResponse.json({ sistema: rows[0], revisoes });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar sistema de IA." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id || !/^\d+$/.test(id)) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    const data = await request.json();
    const {
      sistema,
      tipo,
      descricao,
      area,
      areaUsuario,
      usuarios,
      emails,
      dadosTratados,
      parecerAprovado,
      parecerNumeroChamado,
    } = data ?? {};

    if (!sistema || typeof sistema !== "string" || !sistema.trim()) {
      return NextResponse.json({ error: "Nome do sistema é obrigatório." }, { status: 400 });
    }
    if (tipo && !TIPOS.includes(tipo)) {
      return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
    }
    if (emails && typeof emails === "string" && emails.trim() && !emailsValidos(emails)) {
      return NextResponse.json({ error: "Um ou mais e-mails parecem inválidos — separe múltiplos com ';'." }, { status: 400 });
    }

    const dadosTratadosTexto = Array.isArray(dadosTratados) ? dadosTratados.join(", ") : null;
    const aprovado = parecerAprovado === true || parecerAprovado === "Sim";

    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`
      UPDATE sistemas_ia SET
        sistema = ${sistema.trim()},
        tipo = ${tipo || null},
        descricao = ${descricao || null},
        area = ${area || null},
        area_usuario = ${areaUsuario || null},
        usuarios = ${usuarios || null},
        emails = ${emails || null},
        dados_tratados = ${dadosTratadosTexto},
        parecer_aprovado = ${parecerAprovado == null ? null : aprovado},
        parecer_numero_chamado = ${aprovado ? (parecerNumeroChamado || null) : null}
      WHERE id = ${id}
      RETURNING id
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Sistema não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao salvar alterações." }, { status: 500 });
  }
}
