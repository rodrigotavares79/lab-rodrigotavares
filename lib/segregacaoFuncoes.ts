// Segregação de funções na auditoria de planos (B07). Módulo puro (sem banco,
// sem imports), usado pela rota da auditoria, pela tela e pelos testes
// (tests/segregacaoFuncoes.test.mts).
//
// Quem audita não pode ter executado: o auditor não pode ter criado o plano
// nem ser responsável por nenhuma ação dele. Vale para todos os perfis,
// inclusive Administrador. Ações sem responsável vinculado a um usuário (B09)
// impedem a auditoria, porque não dá para garantir a segregação.

export type DadosConflito = {
  auditorEmail: string;
  criadoPorEmail: string | null;
  acoes: { responsavel_email: string | null; responsavel?: string | null }[];
};

function igual(a: string | null | undefined, b: string | null | undefined): boolean {
  return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Motivo que impede este auditor de auditar o plano, ou null se pode. */
export function motivoConflitoAuditoria(d: DadosConflito): string | null {
  if (igual(d.auditorEmail, d.criadoPorEmail)) {
    return "Você criou este plano de ação. A auditoria precisa ser feita por outra pessoa (segregação de funções).";
  }
  if (d.acoes.some((a) => igual(a.responsavel_email, d.auditorEmail))) {
    return "Você é responsável por uma ou mais ações deste plano. A auditoria precisa ser feita por outra pessoa (segregação de funções).";
  }
  const semVinculo = d.acoes.filter((a) => !a.responsavel_email).length;
  if (semVinculo > 0) {
    return `${semVinculo} ${semVinculo === 1 ? "ação deste plano não tem" : "ações deste plano não têm"} responsável vinculado a um usuário. Vincule os responsáveis na tela do risco antes de auditar, para garantir a segregação de funções.`;
  }
  return null;
}
