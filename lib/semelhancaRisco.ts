// B19 · Detecção de riscos semelhantes no cadastro.
//
// Compara o cenário digitado (evento, causa e consequência — B13) com os
// riscos do mesmo projeto. A comparação é por palavras relevantes: tira
// acentos, pontuação e palavras vazias ("de", "do", "sem"...), e reduz cada
// palavra aos 5 primeiros caracteres, para "exploração"/"explorar" ou
// "vulnerabilidade"/"vulnerabilidades" contarem como a mesma. A nota de cada
// campo é a sobreposição (Jaccard) entre os conjuntos; o evento pesa mais.
//
// Sem imports: o módulo roda direto no `node --test`.

export const LIMIAR_SEMELHANCA = 0.3;
export const MAX_SUGESTOES = 5;

const PESOS = { evento: 0.5, causa: 0.3, consequencia: 0.2 } as const;

const PALAVRAS_VAZIAS = new Set(
  (
    "a o as os um uma uns umas de do da dos das em no na nos nas por pelo pela pelos pelas para pra com sem " +
    "e ou que se ao aos à às sobre entre ate até apos após sob mais menos muito muita seu sua seus suas " +
    "este esta estes estas esse essa isso isto aquele aquela ja já nao não ser estar ter haver ha há como quando " +
    "risco riscos devido razao razão resultando"
  ).split(/\s+/)
);

export function palavrasRelevantes(texto: string | null | undefined): Set<string> {
  const limpo = String(texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ");
  const saida = new Set<string>();
  for (const p of limpo.split(/\s+/)) {
    if (p.length < 3 || PALAVRAS_VAZIAS.has(p)) continue;
    saida.add(p.length > 5 ? p.slice(0, 5) : p);
  }
  return saida;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let comum = 0;
  for (const x of a) if (b.has(x)) comum++;
  return comum / (a.size + b.size - comum);
}

export type CenarioComparavel = { evento?: string | null; causa?: string | null; consequencia?: string | null };

// Nota de 0 a 1. Só os campos preenchidos no cadastro entram na conta (o
// usuário pode ter digitado só o evento), com os pesos redistribuídos.
export function notaSemelhanca(digitado: CenarioComparavel, existente: CenarioComparavel): number {
  let soma = 0;
  let pesos = 0;
  for (const campo of ["evento", "causa", "consequencia"] as const) {
    const a = palavrasRelevantes(digitado[campo]);
    if (a.size === 0) continue;
    const b = palavrasRelevantes(existente[campo]);
    soma += PESOS[campo] * jaccard(a, b);
    pesos += PESOS[campo];
  }
  return pesos === 0 ? 0 : soma / pesos;
}

// Ordena e corta as sugestões acima do limiar.
export function sugerirSemelhantes<T extends CenarioComparavel>(
  digitado: CenarioComparavel,
  candidatos: T[],
  limiar = LIMIAR_SEMELHANCA,
  max = MAX_SUGESTOES
): (T & { nota: number })[] {
  return candidatos
    .map((c) => ({ ...c, nota: Math.round(notaSemelhanca(digitado, c) * 100) / 100 }))
    .filter((c) => c.nota >= limiar)
    .sort((a, b) => b.nota - a.nota)
    .slice(0, max);
}

// Ocorrência não é registrada em risco Mitigado: se o risco voltou, ele não
// está mitigado — cadastre um risco novo (o histórico do antigo fica).
export function podeRegistrarOcorrencia(status: string | null | undefined): string | null {
  if (status === "Mitigado") {
    return "Este risco está Mitigado. Se ele voltou a acontecer, cadastre um risco novo em vez de registrar ocorrência.";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Consolidação de riscos repetidos no mesmo projeto.

export const LIMIAR_DUPLICADO = 0.85;

export type RiscoParaAgrupar = CenarioComparavel & { id: number; projeto_id: number };

// Agrupa riscos do mesmo projeto com cenário quase igual (nota ≥ limiar),
// ligando em cadeia (se A~B e B~C, os três ficam no mesmo grupo). Só devolve
// grupos com 2 ou mais riscos, cada um ordenado por id.
export function agruparDuplicados<T extends RiscoParaAgrupar>(riscos: T[], limiar = LIMIAR_DUPLICADO): T[][] {
  const pai = new Map<number, number>();
  const raiz = (x: number): number => {
    let r = x;
    while (pai.get(r) !== r) r = pai.get(r)!;
    pai.set(x, r);
    return r;
  };
  for (const r of riscos) pai.set(r.id, r.id);
  for (let i = 0; i < riscos.length; i++) {
    for (let j = i + 1; j < riscos.length; j++) {
      const a = riscos[i];
      const b = riscos[j];
      if (a.projeto_id !== b.projeto_id) continue;
      if (notaSemelhanca(a, b) >= limiar && notaSemelhanca(b, a) >= limiar) pai.set(raiz(a.id), raiz(b.id));
    }
  }
  const grupos = new Map<number, T[]>();
  for (const r of riscos) {
    const k = raiz(r.id);
    grupos.set(k, [...(grupos.get(k) || []), r]);
  }
  return [...grupos.values()].filter((g) => g.length > 1).map((g) => g.sort((a, b) => a.id - b.id));
}

export type SituacaoConsolidacao = {
  status: string | null;
  fatores: number;
  aceitacoes: number;
};

// Motivo pelo qual um risco não pode ser absorvido por outro (null = pode).
// Planos de ação e ocorrências são transferidos; fatores e aceitações não,
// porque mudam o nível e a decisão do risco principal.
export function bloqueioComoDuplicado(r: SituacaoConsolidacao): string | null {
  if (r.status === "Mitigado") return "está Mitigado";
  if (r.aceitacoes > 0) return "tem pedido ou aceitação de risco";
  if (r.fatores > 0) return "tem fatores de risco cadastrados";
  return null;
}

export function bloqueioComoPrincipal(r: SituacaoConsolidacao): string | null {
  if (r.status === "Mitigado") return "está Mitigado";
  return null;
}
