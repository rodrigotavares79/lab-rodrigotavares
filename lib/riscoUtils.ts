// A classificação de nível de risco (antes por limiar de produto
// impacto×probabilidade) foi substituída pela matriz 5×5 da metodologia —
// veja `nivelRisco` em lib/metodologiaRisco.ts.

export type SistemaCriticoRates = {
  custo_indisponibilidade_hora: number | string;
  custo_restauracao_hora_homem: number | string;
};

export type ImpactoFinanceiroInput = {
  duracaoHoras?: number | null;
  percentualDegradacao?: number | null;
  restauracaoPessoas?: number | null;
  restauracaoHoras?: number | null;
};

export function calcularImpactoFinanceiro(
  sistema: SistemaCriticoRates | null | undefined,
  input: ImpactoFinanceiroInput
) {
  if (!sistema) {
    return {
      impactoCriticoIndisponibilidade: 0,
      impactoCriticoRestauracao: 0,
      impactoCriticoTotal: 0,
      impactoAltoIndisponibilidade: 0,
      impactoAltoRestauracao: 0,
      impactoAltoTotal: 0,
    };
  }

  const custoIndisp = Number(sistema.custo_indisponibilidade_hora) || 0;
  const custoRestauracao = Number(sistema.custo_restauracao_hora_homem) || 0;
  const horas = Number(input.duracaoHoras) || 0;
  const pct = Number(input.percentualDegradacao) || 0;
  const pessoas = Number(input.restauracaoPessoas) || 0;
  const horasRestauracao = Number(input.restauracaoHoras) || 0;

  const impactoCriticoIndisponibilidade = custoIndisp * horas;
  const impactoCriticoRestauracao = custoRestauracao * pessoas * horasRestauracao;
  const impactoAltoIndisponibilidade = custoIndisp * horas * (pct / 100);
  const impactoAltoRestauracao = custoRestauracao * pessoas * horasRestauracao;

  return {
    impactoCriticoIndisponibilidade,
    impactoCriticoRestauracao,
    impactoCriticoTotal: impactoCriticoIndisponibilidade + impactoCriticoRestauracao,
    impactoAltoIndisponibilidade,
    impactoAltoRestauracao,
    impactoAltoTotal: impactoAltoIndisponibilidade + impactoAltoRestauracao,
  };
}
