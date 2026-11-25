// B15 · Situação dos controles existentes de um risco.
//
// Sem imports: o módulo roda direto no `node --test`.

export type SituacaoControles = "informados" | "sem_controles" | "nao_avaliados";

export const ROTULO_SITUACAO_CONTROLES: Record<SituacaoControles, string> = {
  informados: "Controles informados",
  sem_controles: "Sem controles (declarado)",
  nao_avaliados: "Controles não avaliados",
};

export function situacaoControles(r: { fatores: number; sem_controles: boolean | null }): SituacaoControles {
  if (r.fatores > 0) return "informados";
  if (r.sem_controles) return "sem_controles";
  return "nao_avaliados";
}

export const JUSTIFICATIVA_MINIMA = 15;

// Cadastro: exige ao menos um controle ou a declaração "sem controles" com
// justificativa. Devolve a mensagem de erro ou null.
export function validarControlesCadastro(c: {
  controles: number;
  semControles: boolean;
  justificativa?: string | null;
}): string | null {
  if (c.controles > 0 && c.semControles) {
    return "Informe controles existentes ou declare que não há controles, não os dois.";
  }
  if (c.controles > 0) return null;
  if (!c.semControles) {
    return "Informe ao menos um controle existente ou declare que não há controles para este risco.";
  }
  if (String(c.justificativa ?? "").trim().length < JUSTIFICATIVA_MINIMA) {
    return `Explique por que não há controles (pelo menos ${JUSTIFICATIVA_MINIMA} caracteres).`;
  }
  return null;
}

// Status do controle quando o plano de ação que o implementa é auditado.
export const STATUS_CONTROLE_VALIDADO = "Implementado e validado";
