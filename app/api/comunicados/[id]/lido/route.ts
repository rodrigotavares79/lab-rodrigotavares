import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getUsuarioCondominio } from "@/lib/condominioAuth";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const usuario = await getUsuarioCondominio();
    if (!usuario) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const id = Number(params.id);
    if (!Number.isInteger(id)) return NextResponse.json({ error: "ID inválido." }, { status: 400 });

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    await sql`
      INSERT INTO comunicados_leituras (comunicado_id, usuario_email)
      VALUES (${id}, ${usuario.email})
      ON CONFLICT DO NOTHING
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao marcar como lido." }, { status: 500 });
  }
}
