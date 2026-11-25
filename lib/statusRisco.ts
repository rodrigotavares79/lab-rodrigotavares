// Regras de transição de status de um risco (B01).
//
// Este módulo é puro (sem banco, sem imports) para poder ser usado tanto nas
// rotas da API quanto na tela e nos testes automatizados (tests/).
//
// Ciclo de vida:
//   Identificado  → nenhum plano de ação cadastrado.
//   Em Tratamento → pelo menos um plano de ação cadastrado.
//   Mitigado      → todos os planos (pelo menos um) auditados como Conforme.
//                   Estado terminal: depois dele nada mais muda.
//   Aceito        → (B16) só pela aprovação de uma aceitação com Carta de
//                   Risco (rota de decisão da aceitação), nunca pela
//                   reavaliação. Sair de Aceito segue as regras acima e
//                   revoga a aceitação vigente.

export const STATUS_RISCO = ["Identificado", "Em Tratamento", "Mitigado", "Aceito"] as const;
export type StatusRisco = (typeof STATUS_RISCO)[number];

export type ResumoPlanos = {
  /** Quantidade de planos de ação do risco. */
  total: number;
  /** Quantos desses planos estão auditados como "Conforme". */
  conformes: number;
};

export function statusValido(valor: unknown): valor is StatusRisco {
  return typeof valor === "string" && (STATUS_RISCO as readonly string[]).includes(valor);
}

/**
 * Diz se o risco pode passar de `atual` para `novo`, dado o resumo dos seus
 * planos de ação. Devolve `null` se pode, ou a mensagem de erro se não pode.
 * Manter o mesmo status nunca é bloqueado (permite editar impacto e
 * probabilidade sem mexer no status), exceto em risco já Mitigado.
 */
export function validarTransicaoStatus(
  atual: StatusRisco | null | undefined,
  novo: StatusRisco,
  planos: ResumoPlanos
): string | null {
  const de = atual ?? "Identificado";

  if (de === "Mitigado") {
    return "Este risco já foi mitigado e não pode mais ser alterado.";
  }
  if (novo === de) return null;

  if (novo === "Aceito") {
    return "Para aceitar o risco, solicite a aceitação com a Carta de Risco. O status muda para Aceito quando quem tem alçada aprovar.";
  }

  if (novo === "Identificado" && planos.total > 0) {
    return "Um risco com plano de ação não pode voltar para Identificado. Ele permanece Em Tratamento até que todos os planos sejam auditados como Conforme.";
  }

  if (novo === "Em Tratamento" && planos.total === 0) {
    return "Para marcar como Em Tratamento, cadastre pelo menos um plano de ação para o risco.";
  }

  if (novo === "Mitigado") {
    if (planos.total === 0) {
      return "Para marcar como Mitigado, o risco precisa de pelo menos um plano de ação auditado como Conforme.";
    }
    if (planos.conformes < planos.total) {
      return `Para marcar como Mitigado, todos os planos de ação precisam estar auditados como Conforme (${planos.conformes} de ${planos.total}).`;
    }
  }

  return null;
}

/** Status que o risco pode assumir agora, a partir do atual (inclui o atual). */
export function statusPermitidos(
  atual: StatusRisco | null | undefined,
  planos: ResumoPlanos
): StatusRisco[] {
  return STATUS_RISCO.filter((s) => validarTransicaoStatus(atual, s, planos) === null);
}

/**
 * Status que o risco deve ter automaticamente depois de uma mudança nos seus
 * planos (plano criado, plano reprovado na auditoria). Nunca promove para
 * Mitigado sozinho — isso continua sendo uma decisão explícita de quem
 * reavalia o risco — e nunca mexe em risco já Mitigado.
 */
export function statusAutomatico(
  atual: StatusRisco | null | undefined,
  planos: ResumoPlanos
): StatusRisco {
  const de = atual ?? "Identificado";
  // Mitigado é terminal; Aceito só muda por decisão explícita (B16).
  if (de === "Mitigado" || de === "Aceito") return de;
  return planos.total > 0 ? "Em Tratamento" : "Identificado";
}
