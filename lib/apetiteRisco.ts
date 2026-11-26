// B18 · Apetite e tolerância a risco por categoria. Módulo puro (sem banco,
// sem imports), testado em tests/apetiteRisco.test.mts.
//
// - Apetite: o nível de risco que a organização aceita sem ação adicional.
// - Tolerância: o nível máximo que ela suporta por um tempo, enquanto trata.
// - O risco é comparado pelo nível ATUAL (residual), na escala da política.
// - Os limites são versionados: uma proposta fica Pendente até alguém com
//   alçada (CISO; Administrador para demonstração) aprovar. Quem propõe não
//   aprova a própria proposta. Ao aprovar, a versão Vigente anterior vira
//   Substituída.

export const NIVEIS_APETITE = ["Baixo", "Médio", "Alto", "Crítico"] as const;
export type NivelApetite = (typeof NIVEIS_APETITE)[number];

export type LimiteCategoria = { categoria: string; apetite: string; tolerancia: string };

export type SituacaoApetite = "dentro" | "acima_apetite" | "acima_tolerancia" | "sem_referencia";

export const ROTULO_SITUACAO_APETITE: Record<SituacaoApetite, string> = {
  dentro: "Dentro do apetite",
  acima_apetite: "Acima do apetite",
  acima_tolerancia: "Acima da tolerância",
  sem_referencia: "Sem limite definido",
};

export const SITUACOES_VERSAO = ["Pendente", "Vigente", "Substituída", "Recusada"] as const;

export function ordemNivel(nivel: string | null | undefined): number {
  return nivel ? (NIVEIS_APETITE as readonly string[]).indexOf(nivel) : -1;
}

/** Erro de um par apetite/tolerância, ou null. */
export function validarLimite(l: Partial<LimiteCategoria>): string | null {
  const cat = typeof l.categoria === "string" ? l.categoria.trim() : "";
  if (!cat) return "Informe a categoria.";
  if (ordemNivel(l.apetite) < 0) return `Apetite inválido para ${cat}.`;
  if (ordemNivel(l.tolerancia) < 0) return `Tolerância inválida para ${cat}.`;
  if (ordemNivel(l.tolerancia) < ordemNivel(l.apetite)) {
    return `Em ${cat}, a tolerância não pode ser menor que o apetite.`;
  }
  return null;
}

/** Valida uma proposta de nova versão. */
export function validarProposta(p: { justificativa?: unknown; limites?: unknown }): string | null {
  const just = typeof p.justificativa === "string" ? p.justificativa.trim() : "";
  if (just.length < 20) return "Descreva o motivo da proposta (pelo menos 20 caracteres).";
  if (!Array.isArray(p.limites) || p.limites.length === 0) return "Defina o apetite e a tolerância de ao menos uma categoria.";
  const vistas = new Set<string>();
  for (const l of p.limites as Partial<LimiteCategoria>[]) {
    const erro = validarLimite(l ?? {});
    if (erro) return erro;
    const chave = String(l.categoria).trim().toLowerCase();
    if (vistas.has(chave)) return `A categoria ${String(l.categoria).trim()} aparece mais de uma vez.`;
    vistas.add(chave);
  }
  return null;
}

/** Situação de um risco frente aos limites da sua categoria. */
export function situacaoApetite(
  nivelAtual: string | null | undefined,
  limite: { apetite: string; tolerancia: string } | null | undefined
): SituacaoApetite {
  const n = ordemNivel(nivelAtual);
  if (!limite || n < 0) return "sem_referencia";
  if (n > ordemNivel(limite.tolerancia)) return "acima_tolerancia";
  if (n > ordemNivel(limite.apetite)) return "acima_apetite";
  return "dentro";
}

/** Só risco ativo entra na comparação: mitigado não pesa contra o apetite. */
export function situacaoDoRisco(
  r: { status?: string | null; impacto_qualitativo?: string | null; categoria?: string | null },
  limites: Map<string, { apetite: string; tolerancia: string }>
): SituacaoApetite {
  if (r.status === "Mitigado") return "sem_referencia";
  return situacaoApetite(r.impacto_qualitativo, r.categoria ? limites.get(r.categoria) : null);
}

export function validarDecisaoApetite(d: {
  decisao: unknown;
  motivo?: string | null;
  situacao: string;
  aprovadorEmail: string;
  propostoPorEmail: string;
  temAlcada: boolean;
}): string | null {
  if (d.decisao !== "Aprovar" && d.decisao !== "Recusar") return "Decisão inválida.";
  if (d.situacao !== "Pendente") return "Esta proposta não está aguardando decisão.";
  if (!d.temAlcada) return "Somente o CISO pode aprovar ou recusar o apetite e a tolerância a risco.";
  if (d.aprovadorEmail.trim().toLowerCase() === d.propostoPorEmail.trim().toLowerCase()) {
    return "Quem propôs a versão não pode decidir sobre ela (segregação de funções).";
  }
  if (d.decisao === "Recusar" && !d.motivo?.trim()) return "Informe o motivo da recusa.";
  return null;
}

/** Quais categorias mudaram entre a versão vigente e a proposta. */
export function diferencas(
  vigente: LimiteCategoria[],
  proposta: LimiteCategoria[]
): { categoria: string; antes: string | null; depois: string | null }[] {
  const fmt = (l?: LimiteCategoria) => (l ? `${l.apetite} / ${l.tolerancia}` : null);
  const mapa = new Map(vigente.map((l) => [l.categoria, l]));
  const out: { categoria: string; antes: string | null; depois: string | null }[] = [];
  for (const p of proposta) {
    const a = fmt(mapa.get(p.categoria));
    const d = fmt(p);
    if (a !== d) out.push({ categoria: p.categoria, antes: a, depois: d });
    mapa.delete(p.categoria);
  }
  for (const [cat, l] of mapa) out.push({ categoria: cat, antes: fmt(l), depois: null });
  return out;
}
