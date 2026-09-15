import { calcularRiscoResidual, type FatorParaCalculo } from "@/lib/metodologiaRisco";

// Recalcula o Risco Atual e o Risco Projetado de um risco a partir dos seus
// fatores cadastrados, e grava o resultado nas colunas correspondentes de
// `riscos`. Deve ser chamado depois de qualquer INSERT/UPDATE/DELETE em
// `fatores_risco`, e depois de qualquer edição na probabilidade/impacto
// inerentes do próprio risco.
export async function recomputeRisco(sql: any, riscoId: number | string): Promise<void> {
  const riscoRows = await sql`SELECT probabilidade, impacto FROM riscos WHERE id = ${riscoId}`;
  if (riscoRows.length === 0) return;
  const probabilidadeInerente = riscoRows[0].probabilidade;
  const impactoInerente = riscoRows[0].impacto;
  if (!probabilidadeInerente || !impactoInerente) return;

  const fatoresRows = await sql`
    SELECT criticidade, natureza, tipo_controle, natureza_controle,
           eficacia_potencial, status_implementacao, vetor_override
    FROM fatores_risco
    WHERE risco_id = ${riscoId}
  `;

  const fatores: FatorParaCalculo[] = fatoresRows.map((f: any) => ({
    criticidade: f.criticidade,
    natureza: f.natureza,
    tipoControle: f.tipo_controle,
    naturezaControle: f.natureza_controle,
    eficaciaPotencial: f.eficacia_potencial,
    statusImplementacao: f.status_implementacao,
    vetorOverride: f.vetor_override,
  }));

  const atual = calcularRiscoResidual(probabilidadeInerente, impactoInerente, fatores, false);
  const projetado = calcularRiscoResidual(probabilidadeInerente, impactoInerente, fatores, true);

  await sql`
    UPDATE riscos
    SET
      prob_nivel_atual = ${atual.probabilidade},
      imp_nivel_atual = ${atual.impacto},
      impacto_qualitativo = ${atual.nivel},
      im_prob_atual = ${atual.indiceMitigacaoProb},
      im_imp_atual = ${atual.indiceMitigacaoImp},
      prob_nivel_projetado = ${projetado.probabilidade},
      imp_nivel_projetado = ${projetado.impacto},
      nivel_projetado = ${projetado.nivel},
      im_prob_projetado = ${projetado.indiceMitigacaoProb},
      im_imp_projetado = ${projetado.indiceMitigacaoImp}
    WHERE id = ${riscoId}
  `;
}
