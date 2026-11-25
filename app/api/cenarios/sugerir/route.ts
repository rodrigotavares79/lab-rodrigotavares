import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sugerirSemelhantes } from "@/lib/semelhancaRisco";

export const dynamic = "force-dynamic";

// B27 · POST { evento?, causa?, consequencia? } — cenários do catálogo
// parecidos com o que está sendo cadastrado (até 3), pela mesma comparação
// do B19.
export async function POST(request: NextRequest) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  try {
    const body = await request.json().catch(() => ({}));
    const t = (v: unknown) => (typeof v === "string" ? v.slice(0, 300) : "");
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const cenarios = await sql`
      SELECT id, codigo, nome, evento, causa, consequencia, categoria FROM cenarios_risco WHERE ativo
    `;
    const sugestoes = sugerirSemelhantes(
      { evento: t(body?.evento), causa: t(body?.causa), consequencia: t(body?.consequencia) },
      cenarios as any[],
      0.3,
      3
    );
    return NextResponse.json({ sugestoes });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao sugerir cenários." }, { status: 500 });
  }
}
