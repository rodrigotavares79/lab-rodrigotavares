// B23 · Estimativa quantitativa simples de exposição financeira. Módulo puro
// (sem banco, sem imports), testado em tests/exposicaoRisco.test.mts.
//
// - Frequência anual (quantas vezes por ano o evento deve ocorrer) e perda
//   por evento (R$) são informadas em faixas: mínimo, provável e máximo.
// - A perda anual esperada (ALE) usa a média PERT de cada faixa
//   ((mín + 4 × provável + máx) / 6) multiplicadas. A faixa da ALE vai de
//   mín × mín a máx × máx.
// - A perda por evento pode ser calculada pelo ativo crítico (B14): custo
//   de indisponibilidade por hora × horas de parada (mín, provável, máx).

export type Faixa = { min: number; provavel: number; max: number };

export type Exposicao = { ale: number; min: number; max: number };

export const LIMITE_FREQUENCIA = 365; // no máximo um evento por dia
export const LIMITE_HORAS = 24 * 90; // parada de até 90 dias

function n(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string" || !v.trim()) return null;
  const s = v.trim().replace(/\s|R\$/g, "");
  // 1.234,56 e 10.000 (pontos de milhar, padrão brasileiro) ou 1234.56.
  const norm = s.includes(",")
    ? s.replace(/\./g, "").replace(",", ".")
    : /^-?\d{1,3}(\.\d{3})+$/.test(s)
      ? s.replace(/\./g, "")
      : s;
  const x = Number(norm);
  return Number.isFinite(x) ? x : null;
}

/** Converte a entrada do formulário em faixa, ou devolve o erro. */
export function lerFaixa(v: unknown, nome: string, maximo?: number): Faixa | string {
  const o = (v ?? {}) as Record<string, unknown>;
  const min = n(o.min);
  const provavel = n(o.provavel);
  const max = n(o.max);
  if (min === null || provavel === null || max === null) return `Informe mínimo, provável e máximo de ${nome}.`;
  if (min < 0) return `${nome[0].toUpperCase()}${nome.slice(1)} não pode ser negativa.`;
  if (!(min <= provavel && provavel <= max)) return `Em ${nome}, use mínimo ≤ provável ≤ máximo.`;
  if (max === 0) return `O máximo de ${nome} precisa ser maior que zero.`;
  if (maximo !== undefined && max > maximo) return `O máximo de ${nome} passa do limite (${maximo}).`;
  return { min, provavel, max };
}

export function mediaPert(f: Faixa): number {
  return (f.min + 4 * f.provavel + f.max) / 6;
}

export function calcularExposicao(frequencia: Faixa, perda: Faixa): Exposicao {
  const arred = (x: number) => Math.round(x * 100) / 100;
  return {
    ale: arred(mediaPert(frequencia) * mediaPert(perda)),
    min: arred(frequencia.min * perda.min),
    max: arred(frequencia.max * perda.max),
  };
}

/** Perda por evento pela indisponibilidade: custo por hora do ativo × horas paradas. */
export function perdaPorIndisponibilidade(custoHora: number | string | null | undefined, horas: Faixa): Faixa | null {
  const c = n(custoHora ?? null);
  if (c === null || c <= 0) return null;
  return { min: horas.min * c, provavel: horas.provavel * c, max: horas.max * c };
}

export function moeda(v: number | string | null | undefined, compacta = false): string {
  if (v === null || v === undefined || v === "") return "—";
  const x = Number(v);
  if (compacta && Math.abs(x) >= 1_000_000) return `R$ ${(x / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (compacta && Math.abs(x) >= 1_000) return `R$ ${(x / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return x.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

/** "1 vez a cada 4 anos", "2 vezes por ano"... para ler a frequência. */
export function textoFrequencia(f: number): string {
  if (f <= 0) return "nunca";
  if (f < 1) {
    const anos = Math.round(1 / f);
    return anos === 1 ? "1 vez por ano" : `1 vez a cada ${anos} anos`;
  }
  const v = Math.round(f * 10) / 10;
  return `${v.toLocaleString("pt-BR")} ${v === 1 ? "vez" : "vezes"} por ano`;
}
