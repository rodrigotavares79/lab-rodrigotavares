// Perfis e matriz de permissões do Gestão de Riscos (B11). Módulo puro (sem
// Clerk, sem banco), usado por lib/riscosAuth.ts e pelos testes
// (tests/perfisRiscos.test.mts). A matriz documentada está em
// docs/matriz-permissoes.md — mantenha os dois iguais.
//
// O perfil fica no publicMetadata do Clerk, chave `perfilRiscos`. Conta sem
// essa chave (por exemplo, quem só usa o Gestão de Condomínio) não tem acesso
// nenhum ao módulo.

export type PerfilRiscos =
  | "sem_acesso"
  | "usuario"
  | "analista_grc"
  | "auditor"
  | "coordenador"
  | "gerente"
  | "ciso"
  | "administrador";

export type PermissoesRiscos = {
  /** Ver o módulo: riscos, indicadores, relatórios executivos. */
  ler: boolean;
  /** Cadastrar, importar e reavaliar riscos e fatores. */
  editarRiscos: boolean;
  /** Criar e editar planos de ação, ações e evidências. */
  editarPlanos: boolean;
  /** Ver auditoria, log de alterações e relatório de auditoria. */
  verAuditoria: boolean;
  /** Classificar planos como Conforme / Não conforme. */
  auditar: boolean;
};

export const ROTULO_PERFIL_RISCOS: Record<PerfilRiscos, string> = {
  sem_acesso: "Sem acesso",
  usuario: "Leitura",
  analista_grc: "Analista GRC",
  auditor: "Auditor",
  coordenador: "Coordenador",
  gerente: "Gerente",
  ciso: "CISO",
  administrador: "Administrador",
};

const NADA: PermissoesRiscos = { ler: false, editarRiscos: false, editarPlanos: false, verAuditoria: false, auditar: false };

// Matriz de permissões. Quem audita não executa planos (segregação de funções,
// reforçada por plano no B07).
export const MATRIZ_PERMISSOES: Record<PerfilRiscos, PermissoesRiscos> = {
  sem_acesso: NADA,
  usuario: { ler: true, editarRiscos: false, editarPlanos: false, verAuditoria: false, auditar: false },
  analista_grc: { ler: true, editarRiscos: true, editarPlanos: true, verAuditoria: true, auditar: false },
  auditor: { ler: true, editarRiscos: false, editarPlanos: false, verAuditoria: true, auditar: true },
  coordenador: { ler: true, editarRiscos: true, editarPlanos: false, verAuditoria: true, auditar: true },
  gerente: { ler: true, editarRiscos: true, editarPlanos: false, verAuditoria: true, auditar: true },
  ciso: { ler: true, editarRiscos: true, editarPlanos: false, verAuditoria: true, auditar: true },
  administrador: { ler: true, editarRiscos: true, editarPlanos: true, verAuditoria: true, auditar: true },
};

/**
 * Lê o perfil do publicMetadata. Sem a chave `perfilRiscos` → sem acesso.
 * Valores antigos continuam aceitos: "gestor" = gerente, "analista_senior" =
 * analista_grc. Valor desconhecido → Leitura (o menor perfil com acesso).
 */
export function parsePerfilRiscos(metadata: Record<string, unknown> | null | undefined): PerfilRiscos {
  if (!metadata || !("perfilRiscos" in metadata)) return "sem_acesso";
  const v = metadata.perfilRiscos;
  if (v === "analista_grc" || v === "auditor" || v === "coordenador" || v === "gerente" || v === "ciso" || v === "administrador") return v;
  if (v === "gestor") return "gerente";
  if (v === "analista_senior") return "analista_grc";
  if (v === "sem_acesso") return "sem_acesso";
  return "usuario";
}

export function permissoesDoPerfil(perfil: PerfilRiscos): PermissoesRiscos {
  return MATRIZ_PERMISSOES[perfil];
}

export const MENSAGEM_SEM_PERMISSAO: Record<keyof PermissoesRiscos, string> = {
  ler: "Seu usuário não tem acesso ao Gestão de Riscos. Peça a um administrador para definir seu perfil.",
  editarRiscos: "Seu perfil não permite cadastrar ou editar riscos.",
  editarPlanos: "Seu perfil não permite cadastrar ou editar planos de ação.",
  verAuditoria: "Seu perfil não tem acesso às informações de auditoria.",
  auditar: "Somente auditor, coordenador, gerente ou administrador podem aplicar validações de conformidade.",
};

// B16 · Alçada para aprovar a aceitação de um risco, pelo nível ATUAL do
// risco. Administrador não aprova por padrão: aceitar risco é decisão de
// negócio, não de quem administra o sistema. Documentado em
// docs/matriz-permissoes.md.
export const ALCADA_ACEITACAO: Record<string, PerfilRiscos[]> = {
  Baixo: ["coordenador", "gerente", "ciso"],
  "Médio": ["coordenador", "gerente", "ciso"],
  Alto: ["gerente", "ciso"],
  "Crítico": ["ciso"],
};

export function podeAprovarAceitacao(perfil: PerfilRiscos, nivel: string | null | undefined): boolean {
  if (!nivel) return false;
  return (ALCADA_ACEITACAO[nivel] ?? []).includes(perfil);
}

export function rotuloAlcada(nivel: string | null | undefined): string {
  const perfis = (nivel && ALCADA_ACEITACAO[nivel]) || [];
  return perfis.map((p) => ROTULO_PERFIL_RISCOS[p]).join(", ") || "ninguém";
}

// B18 · Apetite e tolerância a risco: decisão de alta gestão. Aprova o CISO;
// o Administrador também, para operar a demonstração. Quem propõe não aprova.
export const ALCADA_APETITE: PerfilRiscos[] = ["ciso", "administrador"];

export function podeAprovarApetite(perfil: PerfilRiscos): boolean {
  return ALCADA_APETITE.includes(perfil);
}
