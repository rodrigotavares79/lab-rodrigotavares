// B24 · Mapeamento curado de riscos para controles de frameworks.
// Módulo puro (sem imports): recebe o catálogo e o resultado do mapeamento
// por palavra-chave por parâmetro. O app usa lib/catalogoControles, que monta
// esses dados a partir de lib/conformidadeFrameworks. Testado em
// tests/mapeamentoControles.test.mts.
//
// - O mapeamento por palavra-chave (conformidadeFrameworks) deixa de ser o
//   resultado: vira SUGESTÃO, que alguém confirma ou descarta.
// - A biblioteca de cenários (B27) tem controles revisados manualmente; o
//   risco ligado a um cenário recebe esses controles como sugestão
//   "da biblioteca", na frente das sugestões por palavra-chave.
// - Cada controle confirmado para um risco tem status: Implementado, Parcial
//   ou Ausente. A cobertura do framework é a média dos status confirmados
//   (Implementado = 1, Parcial = 0,5, Ausente = 0).

export type FrameworkId = "cis" | "nist" | "iso";
export type Controle = { id: string; titulo: string };
export type Catalogo = Record<FrameworkId, Controle[]>;
/** O que interessa do mapeamento por palavra-chave (lib/conformidadeFrameworks). */
export type TemasEncontrados = { generico: boolean; temas: { tema: { nome: string } & Record<FrameworkId, Controle[]>; termos: string[] }[] };

export const IDS_FRAMEWORK: FrameworkId[] = ["cis", "nist", "iso"];
export const STATUS_CONTROLE = ["Implementado", "Parcial", "Ausente"] as const;
export type StatusControle = (typeof STATUS_CONTROLE)[number];
export const PESO_STATUS: Record<StatusControle, number> = { Implementado: 1, Parcial: 0.5, Ausente: 0 };

export type ControleFw = Controle & { framework: FrameworkId };

/** Catálogo de controles conhecidos (os dos temas), sem repetição, por framework. */
export function montarCatalogo(temas: Record<FrameworkId, Controle[]>[]): Catalogo {
  const out: Record<FrameworkId, Map<string, Controle>> = { cis: new Map(), nist: new Map(), iso: new Map() };
  for (const t of temas) {
    for (const fw of IDS_FRAMEWORK) for (const c of t[fw]) if (!out[fw].has(c.id)) out[fw].set(c.id, c);
  }
  const ordenar = (m: Map<string, Controle>) =>
    [...m.values()].sort((a, b) => a.id.localeCompare(b.id, "pt-BR", { numeric: true }));
  return { cis: ordenar(out.cis), nist: ordenar(out.nist), iso: ordenar(out.iso) };
}

export function buscarControle(catalogo: Catalogo, fw: string, id: string): ControleFw | null {
  if (!(IDS_FRAMEWORK as string[]).includes(fw)) return null;
  const c = catalogo[fw as FrameworkId].find((x) => x.id === id);
  return c ? { ...c, framework: fw as FrameworkId } : null;
}

export function chave(fw: string, id: string) {
  return `${fw}|${id}`;
}

export type Sugestao = ControleFw & { fonte: "biblioteca" | "palavra-chave"; motivo: string };

/**
 * Sugestões para um risco: controles da biblioteca do cenário (revisados) e,
 * depois, os do mapeamento por palavra-chave. Some o que já foi confirmado ou
 * descartado para o risco (`decididos`, chaves framework|controle).
 */
export function sugestoes(
  catalogo: Catalogo,
  m: TemasEncontrados,
  biblioteca: { framework: string; controle_id: string; cenario: string }[],
  decididos: Set<string>
): Sugestao[] {
  const out = new Map<string, Sugestao>();
  for (const b of biblioteca) {
    const c = buscarControle(catalogo, b.framework, b.controle_id);
    const k = chave(b.framework, b.controle_id);
    if (c && !decididos.has(k) && !out.has(k)) out.set(k, { ...c, fonte: "biblioteca", motivo: `cenário ${b.cenario}` });
  }
  if (!m.generico) {
    for (const t of m.temas) {
      for (const fw of IDS_FRAMEWORK) {
        for (const c of t.tema[fw]) {
          const k = chave(fw, c.id);
          if (!decididos.has(k) && !out.has(k)) {
            out.set(k, { ...c, framework: fw, fonte: "palavra-chave", motivo: `${t.tema.nome}: ${t.termos.slice(0, 3).join(", ")}` });
          }
        }
      }
    }
  }
  return [...out.values()];
}

export type Cobertura = {
  framework: FrameworkId;
  controles: number;
  implementado: number;
  parcial: number;
  ausente: number;
  /** 0 a 100, ou null sem nenhum controle confirmado. */
  percentual: number | null;
};

/**
 * Cobertura por framework. Cada controle conta uma vez: quando aparece em
 * vários riscos com status diferentes, vale o pior (o controle só está
 * implementado se estiver para todos os riscos que dependem dele).
 */
export function cobertura(confirmados: { framework: string; controle_id: string; status: string }[]): Cobertura[] {
  const pior = new Map<string, StatusControle>();
  for (const c of confirmados) {
    if (!(STATUS_CONTROLE as readonly string[]).includes(c.status)) continue;
    const k = chave(c.framework, c.controle_id);
    const atual = pior.get(k);
    const novo = c.status as StatusControle;
    if (!atual || PESO_STATUS[novo] < PESO_STATUS[atual]) pior.set(k, novo);
  }
  return IDS_FRAMEWORK.map((fw) => {
    const st = [...pior.entries()].filter(([k]) => k.startsWith(`${fw}|`)).map(([, s]) => s);
    const soma = st.reduce((t, s) => t + PESO_STATUS[s], 0);
    return {
      framework: fw,
      controles: st.length,
      implementado: st.filter((s) => s === "Implementado").length,
      parcial: st.filter((s) => s === "Parcial").length,
      ausente: st.filter((s) => s === "Ausente").length,
      percentual: st.length ? Math.round((soma / st.length) * 100) : null,
    };
  });
}

export function validarDecisao(
  catalogo: Catalogo,
  d: { framework?: unknown; controleId?: unknown; situacao?: unknown; status?: unknown }
): string | null {
  if (!buscarControle(catalogo, String(d.framework ?? ""), String(d.controleId ?? ""))) return "Controle desconhecido.";
  if (d.situacao !== "confirmado" && d.situacao !== "descartado") return "Situação inválida.";
  if (d.situacao === "confirmado" && !(STATUS_CONTROLE as readonly string[]).includes(String(d.status))) {
    return "Escolha o status do controle: Implementado, Parcial ou Ausente.";
  }
  return null;
}

