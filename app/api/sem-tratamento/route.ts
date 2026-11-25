import { exigirPermissao } from "@/lib/riscosAuth";
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// Riscos ativos Alto e Crítico sem tratamento definido e com o prazo da
// política vencido (B02), dos mais antigos para os mais novos. O critério é o
// mesmo da contagem em lib/indicadoresRiscos (semTratamento): se mudar um,
// mude o outro.
export const dynamic = "force-dynamic";

export async function GET() {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const [riscos, [param]] = await Promise.all([
      sql`
        SELECT
          r.id, r.gatilho, r.categoria, r.impacto_qualitativo, r.status,
          p.nome AS projeto,
          to_char(r.criado_em AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS cadastrado_em,
          to_char(t.prazo_tratamento, 'YYYY-MM-DD') AS prazo_tratamento,
          ((now() AT TIME ZONE 'America/Sao_Paulo')::date - t.prazo_tratamento)::int AS dias_atraso
        FROM riscos_tratamento t
        JOIN riscos r ON r.id = t.risco_id
        JOIN projetos p ON p.id = r.projeto_id
        WHERE t.planos = 0 AND NOT t.aceito_valido
          AND t.prazo_tratamento < (now() AT TIME ZONE 'America/Sao_Paulo')::date
        ORDER BY (r.impacto_qualitativo = 'Crítico') DESC, t.prazo_tratamento ASC, r.id
      `,
      sql`SELECT valor FROM parametros_politica WHERE chave = 'prazo_tratamento_dias'`,
    ]);
    return NextResponse.json({ riscos, prazoDias: param?.valor ?? null });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar os riscos sem tratamento." }, { status: 500 });
  }
}
