// B29 · Parâmetros da política editáveis pela tela (Administração →
// Parâmetros da política). Módulo puro, testado em tests/parametrosRegras.test.mts.
// - prazo_tratamento_dias (parametros_politica): dias, a partir do cadastro,
//   para um risco Alto ou Crítico ter tratamento definido.
// - parametros_revisao: de quantos em quantos dias cada nível é revisado.

export const NIVEIS_REVISAO = ["Crítico", "Alto", "Médio", "Baixo"] as const;
export type Parametros = { prazoTratamentoDias: number; revisao: Record<(typeof NIVEIS_REVISAO)[number], number> };

const inteiro = (v: unknown) => (typeof v === "number" || (typeof v === "string" && v.trim() !== "") ? Number(v) : NaN);

/** Valida e normaliza. Nível mais grave não pode ter revisão mais espaçada que um mais leve. */
export function validarParametros(d: { prazoTratamentoDias?: unknown; revisao?: Record<string, unknown> }): Parametros | string {
  const prazo = inteiro(d.prazoTratamentoDias);
  if (!Number.isInteger(prazo) || prazo < 1 || prazo > 365) return "Prazo de tratamento: informe um número inteiro de 1 a 365 dias.";
  const revisao = {} as Parametros["revisao"];
  for (const n of NIVEIS_REVISAO) {
    const v = inteiro(d.revisao?.[n]);
    if (!Number.isInteger(v) || v < 1 || v > 730) return `Revisão de risco ${n}: informe um número inteiro de 1 a 730 dias.`;
    revisao[n] = v;
  }
  for (let i = 1; i < NIVEIS_REVISAO.length; i++) {
    const grave = NIVEIS_REVISAO[i - 1];
    const leve = NIVEIS_REVISAO[i];
    if (revisao[grave] > revisao[leve]) return `Risco ${grave} precisa ser revisado com a mesma frequência ou mais que risco ${leve}.`;
  }
  return { prazoTratamentoDias: prazo, revisao };
}
