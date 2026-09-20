import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { TIPOS } from "@/lib/inventarioIAConstants";

export const dynamic = "force-dynamic";

const TIPOS_VALIDOS = TIPOS;

function emailsValidos(emails: string): boolean {
  return emails
    .split(";")
    .map((e) => e.trim())
    .filter(Boolean)
    .every((e) => e.includes("@"));
}

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const rows = await sql`
      SELECT
        s.id, s.sistema, s.tipo, s.descricao, s.area, s.area_usuario, s.usuarios, s.emails,
        s.dados_tratados, s.parecer_aprovado, s.parecer_numero_chamado, s.criado_em,
        (SELECT MAX(r.data_revisao) FROM revisoes_sistemas_ia r WHERE r.sistema_ia_id = s.id) AS ultima_revisao_em,
        (SELECT r.parecer_aprovado FROM revisoes_sistemas_ia r WHERE r.sistema_ia_id = s.id ORDER BY r.data_revisao DESC, r.id DESC LIMIT 1) AS ultima_revisao_parecer
      FROM sistemas_ia s
      ORDER BY s.criado_em DESC
    `;
    return NextResponse.json({ sistemas: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar sistemas de IA." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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
    if (tipo && !TIPOS_VALIDOS.includes(tipo)) {
      return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
    }
    if (emails && typeof emails === "string" && emails.trim() && !emailsValidos(emails)) {
      return NextResponse.json({ error: "Um ou mais e-mails parecem inválidos — separe múltiplos com ';'." }, { status: 400 });
    }

    const dadosTratadosTexto = Array.isArray(dadosTratados) ? dadosTratados.join(", ") : null;
    const aprovado = parecerAprovado === true || parecerAprovado === "Sim";

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const rows = await sql`
      INSERT INTO sistemas_ia (
        sistema, tipo, descricao, area, area_usuario, usuarios, emails, dados_tratados,
        parecer_aprovado, parecer_numero_chamado
      ) VALUES (
        ${sistema.trim()}, ${tipo || null}, ${descricao || null}, ${area || null}, ${areaUsuario || null},
        ${usuarios || null}, ${emails || null}, ${dadosTratadosTexto},
        ${parecerAprovado == null ? null : aprovado},
        ${aprovado ? (parecerNumeroChamado || null) : null}
      )
      RETURNING id
    `;

    return NextResponse.json({ ok: true, id: rows[0].id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao cadastrar sistema de IA." }, { status: 500 });
  }
}
