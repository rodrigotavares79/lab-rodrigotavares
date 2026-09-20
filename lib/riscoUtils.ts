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

// ---------------------------------------------------------------------------
// PROTÓTIPO — simulação de impacto financeiro por faixa (mín/provável/máx),
// inspirado na abordagem do FAIR (distribuição de perda via Monte Carlo) sem
// exigir os insumos que o FAIR completo pede (frequência de ameaça,
// vulnerabilidade calibrada). Ainda não está ligado a formulário/banco/API —
// é só o motor de cálculo, para validar a abordagem antes de encaixar no
// resto do fluxo.
// ---------------------------------------------------------------------------

export type FaixaEstimativa = {
  min: number;
  provavel: number;
  max: number;
};

export type ImpactoFinanceiroInputFaixas = {
  duracaoHoras?: FaixaEstimativa | null;
  percentualDegradacao?: FaixaEstimativa | null;
  restauracaoPessoas?: FaixaEstimativa | null;
  restauracaoHoras?: FaixaEstimativa | null;
};

export type DistribuicaoImpacto = {
  p10: number;
  p50: number;
  p90: number;
  media: number;
};

export type DistribuicaoCenario = {
  indisponibilidade: DistribuicaoImpacto;
  restauracao: DistribuicaoImpacto;
  total: DistribuicaoImpacto;
};

export type SimulacaoImpactoFinanceiro = {
  critico: DistribuicaoCenario;
  alto: DistribuicaoCenario;
};

// Box-Muller — usado só como insumo do amostrador de Gamma abaixo.
function amostrarNormal(rng: () => number): number {
  const u1 = Math.max(rng(), Number.EPSILON);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Marsaglia-Tsang: padrão para amostrar Gamma(shape) sem dependência externa.
function amostrarGamma(shape: number, rng: () => number): number {
  if (shape < 1) {
    const u = rng();
    return amostrarGamma(1 + shape, rng) * Math.pow(u, 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      x = amostrarNormal(rng);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * x ** 4) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function amostrarBeta(alpha: number, beta: number, rng: () => number): number {
  const x = amostrarGamma(alpha, rng);
  const y = amostrarGamma(beta, rng);
  return x / (x + y);
}

// Distribuição PERT (Beta reparametrizada por mín/moda/máx) — é o formato
// padrão pra transformar uma estimativa de 3 pontos numa distribuição, sem
// exigir treinamento formal em estimativa calibrada.
export function amostrarPERT(faixa: FaixaEstimativa, rng: () => number = Math.random): number {
  const { min, provavel, max } = faixa;
  if (max <= min) return provavel;
  const p = Math.min(Math.max(provavel, min), max);
  const alpha = 1 + (4 * (p - min)) / (max - min);
  const beta = 1 + (4 * (max - p)) / (max - min);
  return min + amostrarBeta(alpha, beta, rng) * (max - min);
}

function resumirDistribuicao(amostras: number[]): DistribuicaoImpacto {
  const ordenado = [...amostras].sort((a, b) => a - b);
  const percentil = (p: number) => ordenado[Math.floor(p * (ordenado.length - 1))];
  const media = amostras.reduce((soma, v) => soma + v, 0) / amostras.length;
  return { p10: percentil(0.1), p50: percentil(0.5), p90: percentil(0.9), media };
}

// Entrada fixa (número) vira uma "faixa" de largura zero — mesmo cálculo do
// ponto único de sempre, só que passando pelo mesmo motor.
function paraFaixa(v: FaixaEstimativa | number | null | undefined): FaixaEstimativa {
  if (v == null) return { min: 0, provavel: 0, max: 0 };
  if (typeof v === "number") return { min: v, provavel: v, max: v };
  return v;
}

export function simularImpactoFinanceiro(
  sistema: SistemaCriticoRates | null | undefined,
  input: ImpactoFinanceiroInputFaixas,
  iteracoes = 10000,
  rng: () => number = Math.random
): SimulacaoImpactoFinanceiro | null {
  if (!sistema) return null;

  const custoIndisp = Number(sistema.custo_indisponibilidade_hora) || 0;
  const custoRestauracao = Number(sistema.custo_restauracao_hora_homem) || 0;

  const faixaHoras = paraFaixa(input.duracaoHoras);
  const faixaPct = paraFaixa(input.percentualDegradacao);
  const faixaPessoas = paraFaixa(input.restauracaoPessoas);
  const faixaHorasRestauracao = paraFaixa(input.restauracaoHoras);

  // Restauração usa a mesma fórmula nos dois cenários (crítico e alto) — é
  // assim no cálculo pontual original (lib/riscoUtils.ts `calcularImpactoFinanceiro`),
  // não uma escolha nova.
  const amostrasIndispCritico: number[] = new Array(iteracoes);
  const amostrasIndispAlto: number[] = new Array(iteracoes);
  const amostrasRestauracao: number[] = new Array(iteracoes);
  const amostrasTotalCritico: number[] = new Array(iteracoes);
  const amostrasTotalAlto: number[] = new Array(iteracoes);

  for (let i = 0; i < iteracoes; i++) {
    const horas = amostrarPERT(faixaHoras, rng);
    const pct = amostrarPERT(faixaPct, rng);
    const pessoas = amostrarPERT(faixaPessoas, rng);
    const horasRestauracao = amostrarPERT(faixaHorasRestauracao, rng);

    const indispCritico = custoIndisp * horas;
    const indispAlto = custoIndisp * horas * (pct / 100);
    const restauracao = custoRestauracao * pessoas * horasRestauracao;

    amostrasIndispCritico[i] = indispCritico;
    amostrasIndispAlto[i] = indispAlto;
    amostrasRestauracao[i] = restauracao;
    amostrasTotalCritico[i] = indispCritico + restauracao;
    amostrasTotalAlto[i] = indispAlto + restauracao;
  }

  const distRestauracao = resumirDistribuicao(amostrasRestauracao);

  return {
    critico: {
      indisponibilidade: resumirDistribuicao(amostrasIndispCritico),
      restauracao: distRestauracao,
      total: resumirDistribuicao(amostrasTotalCritico),
    },
    alto: {
      indisponibilidade: resumirDistribuicao(amostrasIndispAlto),
      restauracao: distRestauracao,
      total: resumirDistribuicao(amostrasTotalAlto),
    },
  };
}
