import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const rows = await sql`
      SELECT nome, tipo FROM catalogo_sistemas_ia ORDER BY nome ASC
    `;
    return NextResponse.json({ catalogo: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar catálogo de sistemas de IA." }, { status: 500 });
  }
}
