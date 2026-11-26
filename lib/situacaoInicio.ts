// B25 · Situação de um risco crítico/alto na lista do Início: destaca quem
// está sem plano e quem tem plano sem prazo definido. Módulo puro (sem banco,
// sem imports), testado em tests/situacaoInicio.test.mts.

export type SituacaoInicio =
  | { tipo: "sem_plano"; texto: string; alerta: true }
  | { tipo: "sem_prazo"; texto: string; alerta: true }
  | { tipo: "atrasado"; texto: string; alerta: true }
  | { tipo: "aceito"; texto: string; alerta: false }
  | { tipo: "vence"; texto: string; alerta: false };

export function situacaoInicio(
  r: { status: string | null; planos_abertos: number; proximo_prazo: string | null },
  hoje: string
): SituacaoInicio {
  if (r.status === "Aceito") return { tipo: "aceito", texto: "aceito", alerta: false };
  if (!r.planos_abertos) return { tipo: "sem_plano", texto: "sem plano", alerta: true };
  if (!r.proximo_prazo) return { tipo: "sem_prazo", texto: "sem prazo", alerta: true };
  const d = String(r.proximo_prazo).slice(0, 10);
  if (d < hoje) return { tipo: "atrasado", texto: "atrasado", alerta: true };
  return { tipo: "vence", texto: `vence ${d.slice(8, 10)}/${d.slice(5, 7)}`, alerta: false };
}
