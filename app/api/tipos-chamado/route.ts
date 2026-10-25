import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getUsuarioCondominio, podeGerirChamados } from "@/lib/condominioAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const rows = await sql`SELECT id, nome, sla_horas FROM tipos_chamado ORDER BY nome ASC`;
    return NextResponse.json({ tipos: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar tipos de chamado." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioCondominio();
    if (!usuario || !podeGerirChamados(usuario.perfil)) {
      return NextResponse.json({ error: "Só o síndico ou conselheiro pode cadastrar tipos de chamado." }, { status: 403 });
    }

    const { nome, slaHoras } = await request.json();
    if (!nome || typeof nome !== "string") {
      return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
    }
    const sla = Number(slaHoras);
    if (!Number.isFinite(sla) || sla <= 0) {
      return NextResponse.json({ error: "SLA (horas) deve ser um número maior que zero." }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const rows = await sql`
      INSERT INTO tipos_chamado (nome, sla_horas, criado_por)
      VALUES (${nome}, ${sla}, ${usuario.email})
      RETURNING id, nome, sla_horas
    `;
    return NextResponse.json({ tipo: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao cadastrar tipo de chamado." }, { status: 500 });
  }
}
