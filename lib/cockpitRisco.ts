// Cockpit do Dashboard: contas derivadas dos dados já existentes (tendência
// dos KPIs, apetite por categoria, estágio do tratamento, prazo das ações).
//
// Sem imports: o módulo roda direto no `node --test`.

export type Tom = "bom" | "ruim" | "neutro";

/**
 * Variação do valor de hoje contra o mês anterior. `sentido` diz o que é
 * melhora: "menor" (ex.: ações atrasadas), "maior" (ex.: % com tratamento)
 * ou "neutro" (ex.: total de riscos ativos, que não é bom nem ruim por si).
 */
export function variacao(
  atual: number | null | undefined,
  anterior: number | null | undefined,
  sentido: "menor" | "maior" | "neutro"
): { delta: number | null; tom: Tom } {
  if (atual === null || atual === undefined || anterior === null || anterior === undefined) return { delta: null, tom: "neutro" };
  const delta = Math.round((atual - anterior) * 10) / 10;
  if (delta === 0 || sentido === "neutro") return { delta, tom: "neutro" };
  const melhorou = sentido === "menor" ? delta < 0 : delta > 0;
  return { delta, tom: melhorou ? "bom" : "ruim" };
}

/** "+3", "−2", "0"; com sufixo opcional ("+5 p.p."). */
export function textoDelta(delta: number | null, sufixo = ""): string {
  if (delta === null) return "";
  const n = Math.abs(delta).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  const sinal = delta > 0 ? "+" : delta < 0 ? "−" : "";
  return `${sinal}${n}${sufixo}`;
}

export type LinhaApetite = {
  categoria: string;
  dentro: number;
  acimaApetite: number;
  acimaTolerancia: number;
  semLimite: number;
  total: number;
};

/**
 * Riscos ativos por categoria, separados pela situação frente ao apetite.
 * Ordem: mais riscos acima da tolerância primeiro, depois acima do apetite,
 * depois o total. Riscos sem categoria entram como "Sem categoria".
 */
export function apetitePorCategoria(
  riscos: { categoria: string | null; situacao: string }[]
): LinhaApetite[] {
  const m = new Map<string, LinhaApetite>();
  for (const r of riscos) {
    const cat = r.categoria || "Sem categoria";
    const l = m.get(cat) ?? { categoria: cat, dentro: 0, acimaApetite: 0, acimaTolerancia: 0, semLimite: 0, total: 0 };
    if (r.situacao === "acima_tolerancia") l.acimaTolerancia++;
    else if (r.situacao === "acima_apetite") l.acimaApetite++;
    else if (r.situacao === "dentro") l.dentro++;
    else l.semLimite++;
    l.total++;
    m.set(cat, l);
  }
  return [...m.values()].sort(
    (a, b) =>
      b.acimaTolerancia - a.acimaTolerancia ||
      b.acimaApetite - a.acimaApetite ||
      b.total - a.total ||
      a.categoria.localeCompare(b.categoria, "pt-BR")
  );
}

export const ESTAGIOS_TRATAMENTO = ["sem_plano", "em_andamento", "concluido", "auditado"] as const;
export type EstagioTratamento = (typeof ESTAGIOS_TRATAMENTO)[number] | "aceito";

export const ROTULO_ESTAGIO: Record<EstagioTratamento, string> = {
  sem_plano: "Sem plano de ação",
  em_andamento: "Plano em andamento",
  concluido: "Planos concluídos",
  auditado: "Auditados conformes",
  aceito: "Risco aceito",
};

/**
 * Onde o risco está no tratamento. Aceito fica à parte (não segue o funil).
 * - sem_plano: nenhum plano;
 * - em_andamento: ao menos um plano não concluído;
 * - concluido: todos os planos concluídos, mas nem todos auditados conformes;
 * - auditado: todos os planos concluídos e auditados como "Conforme".
 */
export function estagioTratamento(r: {
  status: string | null;
  planos: number;
  planosAbertos: number;
  planosConformes: number;
}): EstagioTratamento {
  if (r.status === "Aceito") return "aceito";
  if (!r.planos) return "sem_plano";
  if (r.planosAbertos > 0) return "em_andamento";
  if (r.planosConformes >= r.planos) return "auditado";
  return "concluido";
}

export function funilTratamento(
  riscos: { status: string | null; planos: number; planosAbertos: number; planosConformes: number }[]
): Record<EstagioTratamento, number> {
  const c: Record<EstagioTratamento, number> = { sem_plano: 0, em_andamento: 0, concluido: 0, auditado: 0, aceito: 0 };
  for (const r of riscos) c[estagioTratamento(r)]++;
  return c;
}

export const DIAS_VENCENDO = 30;
export type FaixaPrazo = "atrasada" | "vencendo" | "no_prazo" | "sem_prazo";

function diaJuliano(iso: string): number {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Math.floor(Date.UTC(a, m - 1, d) / 86_400_000);
}

/** Faixa do prazo de uma ação aberta: atrasada, vencendo em até 30 dias, no prazo ou sem prazo. */
export function faixaPrazo(prazo: string | null | undefined, hoje: string): FaixaPrazo {
  if (!prazo || !/^\d{4}-\d{2}-\d{2}/.test(prazo)) return "sem_prazo";
  const dias = diaJuliano(prazo) - diaJuliano(hoje);
  if (dias < 0) return "atrasada";
  if (dias <= DIAS_VENCENDO) return "vencendo";
  return "no_prazo";
}

export function acoesPorPrazo(prazos: (string | null)[], hoje: string): Record<FaixaPrazo, number> {
  const c: Record<FaixaPrazo, number> = { atrasada: 0, vencendo: 0, no_prazo: 0, sem_prazo: 0 };
  for (const p of prazos) c[faixaPrazo(p, hoje)]++;
  return c;
}
