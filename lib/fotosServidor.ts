import { obterIndicadores } from "@/lib/indicadoresRiscos";
import { contagemPorNivel, type FotoIndicadores } from "@/lib/fotosIndicadores";

// B22 · Grava as fotos do mês `referencia` (AAAA-MM-01): uma consolidada
// (projeto_id NULL) e uma por projeto. Regrava se já existir (upsert), então a
// última gravação do mês é a que fica.

async function montarFoto(sql: any, projetoId: number | null): Promise<FotoIndicadores> {
  const ind = await obterIndicadores(sql, projetoId);
  const projetados = await sql`
    SELECT nivel_projetado AS nivel, COUNT(*)::int AS total
    FROM riscos
    WHERE nivel_projetado IS NOT NULL AND (${projetoId}::int IS NULL OR projeto_id = ${projetoId}::int)
    GROUP BY nivel_projetado
  `;
  const k = ind.kpis;
  return {
    total: k.total,
    ativos: k.ativos,
    mitigados: k.mitigados,
    ativosPorNivel: contagemPorNivel(ind.niveis),
    inerente: contagemPorNivel(ind.niveisIniciais),
    atual: contagemPorNivel(ind.niveisAtuaisTodos),
    projetado: contagemPorNivel(projetados),
    semTratamento: k.semTratamento,
    altoCriticoTotal: k.altoCriticoTotal,
    altoCriticoComTratamento: k.altoCriticoComTratamento,
    acoesAtrasadas: k.acoesAtrasadas,
    revisoesVencidas: k.revisoesVencidas,
    auditoriaPendentes: k.auditoriaPendentes,
    planosAbertos: k.planosAbertos,
  };
}

export async function capturarFotos(sql: any, referencia: string, origem: "rotina" | "manual"): Promise<number> {
  const projetos = await sql`SELECT id FROM projetos ORDER BY id`;
  const alvos: (number | null)[] = [null, ...projetos.map((p: any) => p.id)];
  for (const projetoId of alvos) {
    const dados = await montarFoto(sql, projetoId);
    await sql`
      INSERT INTO fotos_indicadores (referencia, projeto_id, dados, origem)
      VALUES (${referencia}, ${projetoId}, ${JSON.stringify(dados)}::jsonb, ${origem})
      ON CONFLICT (referencia, COALESCE(projeto_id, 0))
      DO UPDATE SET dados = EXCLUDED.dados, capturado_em = now(), origem = EXCLUDED.origem
    `;
  }
  return alvos.length;
}
