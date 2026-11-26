import { exigirPermissao } from "@/lib/riscosAuth";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// Riscos por mês (B05), usado na página Tendências. Saiu do Dashboard quando
// ele virou cockpit.
export async function GET(request: NextRequest) {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  try {
    const projetoParam = request.nextUrl.searchParams.get("projetoId");
    if (projetoParam && !/^\d+$/.test(projetoParam)) {
      return NextResponse.json({ error: "projetoId deve ser numérico." }, { status: 400 });
    }
    const projetoId = projetoParam ? Number(projetoParam) : null;
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });

    const evolucao = await sql`
      WITH base AS (
        SELECT
          date_trunc('month', NULLIF(data_levantamento::text, '')::date) AS mes_lev,
          date_trunc('month', criado_em AT TIME ZONE 'America/Sao_Paulo') AS mes_cad
        FROM riscos
        WHERE (${projetoId}::int IS NULL OR projeto_id = ${projetoId}::int)
      ),
      meses AS (
        SELECT generate_series(
          LEAST((SELECT MIN(mes_lev) FROM base), (SELECT MIN(mes_cad) FROM base)),
          date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo'),
          interval '1 month'
        ) AS mes
      )
      SELECT
        to_char(m.mes, 'YYYY-MM') AS mes,
        (SELECT COUNT(*) FROM base WHERE mes_lev = m.mes)::int AS levantamento,
        (SELECT COUNT(*) FROM base WHERE mes_cad = m.mes)::int AS cadastro
      FROM meses m
      ORDER BY m.mes
    `;
    const [{ sem_data: semDataLevantamento }] = await sql`
      SELECT COUNT(*)::int AS sem_data
      FROM riscos
      WHERE NULLIF(data_levantamento::text, '') IS NULL
        AND (${projetoId}::int IS NULL OR projeto_id = ${projetoId}::int)
    `;


    return NextResponse.json({ evolucao, semDataLevantamento });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar a evolução mensal." }, { status: 500 });
  }
}
