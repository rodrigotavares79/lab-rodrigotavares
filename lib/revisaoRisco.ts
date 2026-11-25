// Situação da revisão periódica de um risco (B17), para exibição. Módulo
// puro (sem banco, sem imports), testado em tests/revisaoRisco.test.mts.
// A data da próxima revisão vem do banco (view riscos_revisao).

export type SituacaoRevisao =
  | { estado: "vencida"; dias: number }
  | { estado: "vence_em_breve"; dias: number }
  | { estado: "em_dia"; dias: number }
  | { estado: "sem_prazo" };

/** Dias de antecedência para avisar que a revisão está chegando. */
export const AVISO_DIAS = 15;

function paraDiaUTC(data: string): number {
  const [a, m, d] = data.slice(0, 10).split("-").map(Number);
  return Date.UTC(a, m - 1, d);
}

/** Hoje (AAAA-MM-DD) no fuso de São Paulo, o mesmo usado pelo banco. */
export function hojeSaoPaulo(agora: Date = new Date()): string {
  return agora.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

export function situacaoRevisao(proxima: string | null | undefined, hoje: string): SituacaoRevisao {
  if (!proxima) return { estado: "sem_prazo" };
  const dias = Math.round((paraDiaUTC(proxima) - paraDiaUTC(hoje)) / 86_400_000);
  if (dias < 0) return { estado: "vencida", dias: -dias };
  if (dias <= AVISO_DIAS) return { estado: "vence_em_breve", dias };
  return { estado: "em_dia", dias };
}

export function textoSituacaoRevisao(s: SituacaoRevisao): string {
  switch (s.estado) {
    case "vencida":
      return `vencida há ${s.dias} dia${s.dias === 1 ? "" : "s"}`;
    case "vence_em_breve":
      return s.dias === 0 ? "vence hoje" : `vence em ${s.dias} dia${s.dias === 1 ? "" : "s"}`;
    case "em_dia":
      return `em dia, faltam ${s.dias} dias`;
    case "sem_prazo":
      return "sem prazo definido";
  }
}
