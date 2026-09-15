// Motor de cálculo da metodologia de avaliação de riscos de SI.
// Baseado na planilha de referência (ISO/IEC 27005, ISO 31000, NIST SP 800-30,
// NIST CSF 2.0), aba "Parâmetros". Toda constante aqui replica um número
// literal daquela aba — não são estimativas.
//
// Este módulo é puro (sem acesso a banco), pra poder ser testado e reutilizado
// tanto na criação/edição de risco quanto no recálculo disparado por fatores.

export const PESO_CRITICIDADE: Record<string, number> = {
  "Muito Alta": 5,
  "Alta": 4,
  "Média": 3,
  "Baixa": 2,
  "Muito Baixa": 1,
};

export const FATOR_EFICACIA: Record<string, number> = {
  "Alta": 1,
  "Média": 0.65,
  "Baixa": 0.35,
  "Inexistente": 0,
};

export const MODIFICADOR_NATUREZA_CONTROLE: Record<string, number> = {
  "Técnico automatizado": 1,
  "Técnico com intervenção manual": 0.85,
  "Processo / Manual": 0.7,
};

export const PERCENTUAL_STATUS: Record<string, number> = {
  "Não iniciado": 0,
  "Planejado / Em desenho": 0.15,
  "Em implementação": 0.5,
  "Implementado — pendente de validação": 0.8,
  "Implementado e validado": 1,
};

export type Vetor = "Probabilidade" | "Impacto" | "Ambos";

// Natureza do Fator × Tipo de Controle -> vetor sugerido (Parâmetros §13)
export const MATRIZ_VETOR: Record<string, Record<string, Vetor>> = {
  "Exposição": {
    "Preventivo": "Probabilidade",
    "Detectivo": "Ambos",
    "Corretivo": "Impacto",
    "Diretivo / Governança": "Probabilidade",
  },
  "Amplificação": {
    "Preventivo": "Ambos",
    "Detectivo": "Impacto",
    "Corretivo": "Impacto",
    "Diretivo / Governança": "Impacto",
  },
  "Misto": {
    "Preventivo": "Probabilidade",
    "Detectivo": "Ambos",
    "Corretivo": "Impacto",
    "Diretivo / Governança": "Ambos",
  },
};

export const ALPHA: Record<Vetor, { prob: number; imp: number }> = {
  "Probabilidade": { prob: 1, imp: 0 },
  "Impacto": { prob: 0, imp: 1 },
  "Ambos": { prob: 0.5, imp: 0.5 },
};

// Matriz 5×5 (Parâmetros §6) — linha = Probabilidade (1–5), coluna = Impacto (1–5)
export const MATRIZ_5X5: number[][] = [
  /* prob 1 */ [1, 1, 1, 2, 3],
  /* prob 2 */ [1, 1, 2, 3, 3],
  /* prob 3 */ [1, 2, 2, 3, 4],
  /* prob 4 */ [1, 2, 3, 4, 4],
  /* prob 5 */ [2, 3, 4, 4, 4],
];

export const NIVEL_RISCO_LABEL: Record<number, string> = {
  1: "Baixo",
  2: "Moderado",
  3: "Significativo",
  4: "Alto",
};

export const NIVEIS_RISCO_ORDEM = ["Baixo", "Moderado", "Significativo", "Alto"];

// Faixas do Índice de Mitigação -> redução em níveis (Parâmetros §14).
// Ordem decrescente de limiar — a primeira faixa cujo "min" o IM atinge vence.
const FAIXAS_INDICE_MITIGACAO = [
  { min: 0.905, deltaProb: 3, deltaImp: 2 },
  { min: 0.70, deltaProb: 2, deltaImp: 1 },
  { min: 0.45, deltaProb: 1, deltaImp: 1 },
  { min: 0.20, deltaProb: 1, deltaImp: 0 },
  { min: 0, deltaProb: 0, deltaImp: 0 },
];

export function deltaPorIndiceMitigacao(indiceMitigacao: number): { deltaProb: number; deltaImp: number } {
  for (const faixa of FAIXAS_INDICE_MITIGACAO) {
    if (indiceMitigacao >= faixa.min) {
      return { deltaProb: faixa.deltaProb, deltaImp: faixa.deltaImp };
    }
  }
  return { deltaProb: 0, deltaImp: 0 };
}

function clamp15(n: number): number {
  return Math.min(5, Math.max(1, Math.round(n)));
}

export function nivelRisco(probabilidade: number, impacto: number): string {
  const p = clamp15(probabilidade);
  const i = clamp15(impacto);
  return NIVEL_RISCO_LABEL[MATRIZ_5X5[p - 1][i - 1]];
}

export type FatorParaCalculo = {
  criticidade: string;
  natureza: string; // "Exposição" | "Amplificação" | "Misto"
  tipoControle: string;
  naturezaControle: string;
  eficaciaPotencial: string;
  statusImplementacao: string;
  vetorOverride?: string | null;
};

export type FatorCalculado = {
  peso: number;
  fatorEficacia: number;
  modificadorNaturezaControle: number;
  eficaciaPotencialCalc: number;
  percentualImplementacao: number;
  eficaciaAtual: number;
  vetorSugerido: Vetor;
  vetorAdotado: Vetor;
  alphaProb: number;
  alphaImp: number;
};

export function calcularFator(f: FatorParaCalculo): FatorCalculado {
  const peso = PESO_CRITICIDADE[f.criticidade] ?? 1;
  const fatorEficacia = FATOR_EFICACIA[f.eficaciaPotencial] ?? 0;
  const modificadorNaturezaControle = MODIFICADOR_NATUREZA_CONTROLE[f.naturezaControle] ?? 0.7;
  const eficaciaPotencialCalc = fatorEficacia * modificadorNaturezaControle;
  const percentualImplementacao = PERCENTUAL_STATUS[f.statusImplementacao] ?? 0;
  const eficaciaAtual = eficaciaPotencialCalc * percentualImplementacao;
  const vetorSugerido = MATRIZ_VETOR[f.natureza]?.[f.tipoControle] ?? "Ambos";
  const vetorAdotado = (f.vetorOverride as Vetor) || vetorSugerido;
  const alpha = ALPHA[vetorAdotado] ?? ALPHA["Ambos"];
  return {
    peso,
    fatorEficacia,
    modificadorNaturezaControle,
    eficaciaPotencialCalc,
    percentualImplementacao,
    eficaciaAtual,
    vetorSugerido,
    vetorAdotado,
    alphaProb: alpha.prob,
    alphaImp: alpha.imp,
  };
}

// Índice de Mitigação de uma dimensão (Probabilidade ou Impacto), considerando
// só os fatores que direcionam (parcial ou totalmente) para ela.
// usarPotencial=false -> Eficácia Atual (o que já está implementado hoje).
// usarPotencial=true  -> Eficácia Potencial (assume 100% de implementação = Projetado).
export function calcularIndiceMitigacao(
  fatores: FatorParaCalculo[],
  dimensao: "prob" | "imp",
  usarPotencial: boolean
): number {
  let numerador = 0;
  let denominador = 0;
  for (const f of fatores) {
    const c = calcularFator(f);
    const alphaDim = dimensao === "prob" ? c.alphaProb : c.alphaImp;
    if (alphaDim === 0) continue;
    const eficacia = usarPotencial ? c.eficaciaPotencialCalc : c.eficaciaAtual;
    numerador += c.peso * eficacia * alphaDim;
    denominador += c.peso * alphaDim;
  }
  if (denominador === 0) return 0;
  return numerador / denominador;
}

export type RiscoResidual = {
  probabilidade: number;
  impacto: number;
  nivel: string;
  indiceMitigacaoProb: number;
  indiceMitigacaoImp: number;
};

// Risco residual (Atual ou Projetado, conforme usarPotencial) a partir do
// risco inerente (probabilidade/impacto brutos, 1–5) e da lista de fatores.
// Sem nenhum fator cadastrado, IM = 0% nas duas dimensões e o residual é
// idêntico ao inerente — comportamento esperado do modelo, não uma falha.
export function calcularRiscoResidual(
  probabilidadeInerente: number,
  impactoInerente: number,
  fatores: FatorParaCalculo[],
  usarPotencial: boolean
): RiscoResidual {
  const indiceMitigacaoProb = calcularIndiceMitigacao(fatores, "prob", usarPotencial);
  const indiceMitigacaoImp = calcularIndiceMitigacao(fatores, "imp", usarPotencial);
  const { deltaProb } = deltaPorIndiceMitigacao(indiceMitigacaoProb);
  const { deltaImp } = deltaPorIndiceMitigacao(indiceMitigacaoImp);
  const probabilidade = Math.max(1, probabilidadeInerente - deltaProb);
  const impacto = Math.max(1, impactoInerente - deltaImp);
  return {
    probabilidade,
    impacto,
    nivel: nivelRisco(probabilidade, impacto),
    indiceMitigacaoProb,
    indiceMitigacaoImp,
  };
}

export const OPCOES_NATUREZA_FATOR = ["Exposição", "Amplificação", "Misto"];
export const OPCOES_CRITICIDADE = ["Muito Alta", "Alta", "Média", "Baixa", "Muito Baixa"];
export const OPCOES_TIPO_CONTROLE = ["Preventivo", "Detectivo", "Corretivo", "Diretivo / Governança"];
export const OPCOES_NATUREZA_CONTROLE = ["Técnico automatizado", "Técnico com intervenção manual", "Processo / Manual"];
export const OPCOES_EFICACIA_POTENCIAL = ["Alta", "Média", "Baixa", "Inexistente"];
export const OPCOES_STATUS_IMPLEMENTACAO = [
  "Não iniciado",
  "Planejado / Em desenho",
  "Em implementação",
  "Implementado — pendente de validação",
  "Implementado e validado",
];
export const OPCOES_VETOR: Vetor[] = ["Probabilidade", "Impacto", "Ambos"];
