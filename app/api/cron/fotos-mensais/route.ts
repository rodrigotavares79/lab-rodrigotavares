import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { capturarFotos } from "@/lib/fotosServidor";
import { referenciaDaFoto } from "@/lib/fotosIndicadores";
import { hojeSaoPaulo } from "@/lib/revisaoRisco";

export const dynamic = "force-dynamic";

// B22 · Rotina diária (vercel.json): atualiza a foto do mês corrente; no dia
// 1, grava o fechamento do mês anterior. Não usa exigirPermissao porque quem
// chama é o agendador da Vercel, não um usuário; se a variável CRON_SECRET
// existir, exige "Authorization: Bearer <CRON_SECRET>" (mesmo padrão de
// /api/condominio-sla/verificar). A rota só grava fotos (idempotente) e não
// devolve nenhum dado de risco.
export async function GET(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (segredo && request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const referencia = referenciaDaFoto(hojeSaoPaulo());
    const fotos = await capturarFotos(sql, referencia, "rotina");
    return NextResponse.json({ referencia, fotos });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao gravar as fotos." }, { status: 500 });
  }
}
