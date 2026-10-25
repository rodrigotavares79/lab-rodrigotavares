import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getUsuarioCondominio, podeGerirChamados } from "@/lib/condominioAuth";

export const dynamic = "force-dynamic";

const URGENCIAS_VALIDAS = ["Baixa", "Média", "Urgente"];
const TIPOS_VALIDOS = ["Problema", "Demanda"];

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const rows = await sql`
      SELECT id, nome, categoria, urgencia, tipo, sla_horas
      FROM catalogo_servicos ORDER BY nome ASC
    `;
    return NextResponse.json({ servicos: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar o catálogo de serviços." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioCondominio();
    if (!usuario || !podeGerirChamados(usuario.perfil)) {
      return NextResponse.json({ error: "Só o síndico ou conselheiro pode cadastrar serviços." }, { status: 403 });
    }

    const { nome, categoria, urgencia, tipo, slaHoras } = await request.json();
    if (!nome || typeof nome !== "string") {
      return NextResponse.json({ error: "Nome (serviço) é obrigatório." }, { status: 400 });
    }
    if (!URGENCIAS_VALIDAS.includes(urgencia)) {
      return NextResponse.json({ error: `Urgência inválida. Use uma de: ${URGENCIAS_VALIDAS.join(", ")}.` }, { status: 400 });
    }
    if (!TIPOS_VALIDOS.includes(tipo)) {
      return NextResponse.json({ error: `Tipo inválido. Use um de: ${TIPOS_VALIDOS.join(", ")}.` }, { status: 400 });
    }
    const sla = Number(slaHoras);
    if (!Number.isFinite(sla) || sla <= 0) {
      return NextResponse.json({ error: "SLA (horas) deve ser um número maior que zero." }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const rows = await sql`
      INSERT INTO catalogo_servicos (nome, categoria, urgencia, tipo, sla_horas, criado_por)
      VALUES (${nome}, ${categoria || null}, ${urgencia}, ${tipo}, ${sla}, ${usuario.email})
      RETURNING id, nome, categoria, urgencia, tipo, sla_horas
    `;
    return NextResponse.json({ servico: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao cadastrar o serviço." }, { status: 500 });
  }
}
