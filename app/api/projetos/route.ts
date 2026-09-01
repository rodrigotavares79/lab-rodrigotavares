import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`SELECT id, nome FROM projetos ORDER BY nome ASC`;
    return NextResponse.json({ projetos: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar projetos." }, { status: 500 });
  }
}
