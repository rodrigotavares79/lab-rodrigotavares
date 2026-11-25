// Regras da aceitação formal de risco (B16). Módulo puro (sem banco, sem
// imports), testado em tests/aceitacaoRisco.test.mts. A alçada vem de
// lib/perfisRiscos (podeAprovarAceitacao / rotuloAlcada) e entra pronta.

export const OPCOES_TRATAMENTO = ["Mitigar", "Aceitar", "Transferir", "Evitar"] as const;
export type OpcaoTratamento = (typeof OPCOES_TRATAMENTO)[number];

export const VALIDADE_PADRAO_MESES = 12;
export const VALIDADE_MAXIMA_MESES = 24;
export const TIPOS_CARTA = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

export function opcaoValida(v: unknown): v is OpcaoTratamento {
  return typeof v === "string" && (OPCOES_TRATAMENTO as readonly string[]).includes(v);
}

export function validarSolicitacao(d: {
  statusRisco: string;
  justificativa: string | null | undefined;
  validadeMeses: number;
  temAtiva: boolean;
}): string | null {
  if (d.statusRisco === "Mitigado") return "Risco mitigado não pode ser aceito.";
  if (d.temAtiva) return "Este risco já tem uma aceitação aguardando aprovação ou vigente.";
  if (!d.justificativa || d.justificativa.trim().length < 20) {
    return "Descreva a justificativa da aceitação (pelo menos 20 caracteres).";
  }
  if (!Number.isInteger(d.validadeMeses) || d.validadeMeses < 1 || d.validadeMeses > VALIDADE_MAXIMA_MESES) {
    return `A validade deve ser de 1 a ${VALIDADE_MAXIMA_MESES} meses.`;
  }
  return null;
}

export function validarDecisao(d: {
  decisao: unknown;
  motivo: string | null | undefined;
  situacao: string;
  aprovadorEmail: string;
  solicitanteEmail: string;
  temAlcada: boolean;
  alcadaTexto: string;
  nivelRisco: string | null | undefined;
}): string | null {
  if (d.decisao !== "Aprovar" && d.decisao !== "Recusar") return "Decisão inválida.";
  if (d.situacao !== "Pendente") return "Esta aceitação não está aguardando decisão.";
  if (d.aprovadorEmail.trim().toLowerCase() === d.solicitanteEmail.trim().toLowerCase()) {
    return "Quem solicitou a aceitação não pode decidir sobre ela (segregação de funções).";
  }
  if (!d.temAlcada) {
    return `Aceitar risco ${d.nivelRisco ?? "sem nível"} exige alçada de: ${d.alcadaTexto}.`;
  }
  if (d.decisao === "Recusar" && !d.motivo?.trim()) return "Informe o motivo da recusa.";
  return null;
}

/** Data (AAAA-MM-DD) até quando a aceitação vale: hoje + meses. */
export function calcularValidoAte(hoje: string, meses: number): string {
  const [a, m, d] = hoje.split("-").map(Number);
  const alvo = new Date(Date.UTC(a, m - 1 + meses, d));
  // 31/01 + 1 mês não pode virar 03/03: fica no último dia do mês.
  if (alvo.getUTCDate() !== d) alvo.setUTCDate(0);
  return alvo.toISOString().slice(0, 10);
}
