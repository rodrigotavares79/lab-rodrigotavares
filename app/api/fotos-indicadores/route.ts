import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";
import { capturarFotos } from "@/lib/fotosServidor";
import { mesesAte } from "@/lib/fotosIndicadores";
import { hojeSaoPaulo } from "@/lib/revisaoRisco";

export const dynamic = "force-dynamic";

// B22 · GET ?projetoId=&meses=6|12 — fotos mensais para os gráficos de
// tendência (consolidado quando não há projeto).
export async function GET(request: NextRequest) {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  try {
    const p = request.nextUrl.searchParams.get("projetoId");
    const projetoId = p && /^\d+$/.test(p) ? Number(p) : null;
    const n = request.nextUrl.searchParams.get("meses") === "6" ? 6 : 12;
    // Mês corrente (ainda aberto, atualizado todo dia) e os anteriores.
    const atual = hojeSaoPaulo().slice(0, 7) + "-01";
    const meses = mesesAte(atual, n);
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const fotos = await sql`
      SELECT to_char(referencia, 'YYYY-MM-DD') AS referencia, dados, capturado_em, origem
      FROM fotos_indicadores
      WHERE COALESCE(projeto_id, 0) = ${projetoId ?? 0} AND referencia >= ${meses[0]}
      ORDER BY referencia
    `;
    return NextResponse.json({ meses, fotos, mesAberto: atual, podeCapturar: !!guarda.usuario.permissoes.editarRiscos });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar as fotos." }, { status: 500 });
  }
}

// POST — atualiza agora a foto do mês corrente (todas as visões). Útil para a
// primeira foto e depois de grandes mudanças; a rotina diária faz o mesmo.
export async function POST() {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const referencia = hojeSaoPaulo().slice(0, 7) + "-01";
    const fotos = await capturarFotos(sql, referencia, "manual");
    return NextResponse.json({ referencia, fotos });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao gravar as fotos." }, { status: 500 });
  }
}
