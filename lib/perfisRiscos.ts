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
  /** Convidar usuários e atribuir perfis (tela Usuários e perfis). */
  gerirUsuarios: boolean;
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

const NADA: PermissoesRiscos = { ler: false, editarRiscos: false, editarPlanos: false, verAuditoria: false, auditar: false, gerirUsuarios: false };

// Matriz de permissões. Quem audita não executa planos (segregação de funções,
// reforçada por plano no B07).
export const MATRIZ_PERMISSOES: Record<PerfilRiscos, PermissoesRiscos> = {
  sem_acesso: NADA,
  usuario: { ler: true, editarRiscos: false, editarPlanos: false, verAuditoria: false, auditar: false, gerirUsuarios: false },
  analista_grc: { ler: true, editarRiscos: true, editarPlanos: true, verAuditoria: true, auditar: false, gerirUsuarios: false },
  auditor: { ler: true, editarRiscos: false, editarPlanos: false, verAuditoria: true, auditar: true, gerirUsuarios: false },
  coordenador: { ler: true, editarRiscos: true, editarPlanos: false, verAuditoria: true, auditar: true, gerirUsuarios: false },
  gerente: { ler: true, editarRiscos: true, editarPlanos: false, verAuditoria: true, auditar: true, gerirUsuarios: false },
  ciso: { ler: true, editarRiscos: true, editarPlanos: false, verAuditoria: true, auditar: true, gerirUsuarios: true },
  administrador: { ler: true, editarRiscos: true, editarPlanos: true, verAuditoria: true, auditar: true, gerirUsuarios: true },
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
  gerirUsuarios: "Somente o Administrador ou o CISO gerenciam usuários e perfis.",
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

// ---------------------------------------------------------------------------
// Gestão de usuários (tela Usuários e perfis). Administrador e CISO gerenciam.
// Para não haver escalada de privilégio: ninguém altera o próprio perfil, só
// um Administrador concede ou altera o perfil Administrador, e o último
// Administrador não pode ser rebaixado. Com SSO, um perfil definido por grupo
// do provedor de identidade (publicMetadata.perfilRiscosOrigem = "grupo")
// fica travado na tela.

/** Perfis que podem ser atribuídos, do menor para o maior acesso. */
export const PERFIS_ATRIBUIVEIS: PerfilRiscos[] = [
  "usuario",
  "analista_grc",
  "auditor",
  "coordenador",
  "gerente",
  "ciso",
  "administrador",
];

export function perfilAtribuivel(v: unknown): v is PerfilRiscos {
  return typeof v === "string" && (PERFIS_ATRIBUIVEIS as string[]).includes(v);
}

/** Perfil definido por grupo do provedor de identidade (SSO)? */
export function perfilPorGrupo(metadata: Record<string, unknown> | null | undefined): boolean {
  return metadata?.perfilRiscosOrigem === "grupo";
}

/** Erro de uma mudança de perfil, ou null. `novo` = "sem_acesso" remove o acesso ao módulo. */
export function validarMudancaPerfil(d: {
  ator: PerfilRiscos;
  atorId: string;
  alvoId: string;
  atual: PerfilRiscos;
  novo: unknown;
  administradores: number;
  porGrupo?: boolean;
}): string | null {
  if (!MATRIZ_PERMISSOES[d.ator].gerirUsuarios) return MENSAGEM_SEM_PERMISSAO.gerirUsuarios;
  if (d.novo !== "sem_acesso" && !perfilAtribuivel(d.novo)) return "Perfil inválido.";
  if (d.atorId === d.alvoId) return "Você não pode alterar o próprio perfil.";
  if (d.porGrupo) return "Este perfil é definido por um grupo do provedor de identidade (SSO). Altere o grupo do usuário lá.";
  if (d.novo === d.atual) return "O usuário já tem esse perfil.";
  if (d.ator !== "administrador" && (d.atual === "administrador" || d.novo === "administrador")) {
    return "Só um Administrador concede ou altera o perfil Administrador.";
  }
  if (d.atual === "administrador" && d.administradores <= 1) return "Não é possível tirar o último Administrador.";
  return null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Erro de um convite, ou null. */
export function validarConvite(d: { ator: PerfilRiscos; email: unknown; perfil: unknown }): string | null {
  if (!MATRIZ_PERMISSOES[d.ator].gerirUsuarios) return MENSAGEM_SEM_PERMISSAO.gerirUsuarios;
  if (typeof d.email !== "string" || !EMAIL.test(d.email.trim())) return "Informe um e-mail válido.";
  if (!perfilAtribuivel(d.perfil)) return "Escolha o perfil do usuário.";
  if (d.perfil === "administrador" && d.ator !== "administrador") return "Só um Administrador convida outro Administrador.";
  return null;
}
