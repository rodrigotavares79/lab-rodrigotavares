import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

// Perfis de acesso do Gestão de Riscos, guardados no publicMetadata do Clerk
// (Dashboard > Users > usuário > Metadata > Public), chave `perfilRiscos`:
//
//   "usuario"        Usuário comum — lê e emite relatórios; não cadastra nada e
//                    não vê nenhuma informação de auditoria. (padrão: quem não
//                    tem a chave cai aqui)
//   "analista_grc"   Analista GRC — lê tudo, cadastra e edita riscos e planos
//                    de ação, vê a auditoria (não audita).
//   "coordenador"    Coordenador / Gerente — lê tudo, cadastra e edita riscos
//   "gerente"        e aplica as validações de conformidade (Conforme / Não
//                    conforme). Não edita planos de ação: quem valida não
//                    executa (segregação de funções).
//   "administrador"  Pode fazer qualquer coisa.
//
// Valores antigos continuam aceitos: "gestor" = gerente,
// "analista_senior" = analista_grc.

export type PerfilRiscos = "usuario" | "analista_grc" | "coordenador" | "gerente" | "administrador";

export const ROTULO_PERFIL_RISCOS: Record<PerfilRiscos, string> = {
  usuario: "Usuário comum",
  analista_grc: "Analista GRC",
  coordenador: "Coordenador",
  gerente: "Gerente",
  administrador: "Administrador",
};

export type PermissoesRiscos = {
  editarRiscos: boolean;
  editarPlanos: boolean;
  verAuditoria: boolean;
  auditar: boolean;
};

const PERMISSOES: Record<PerfilRiscos, PermissoesRiscos> = {
  usuario: { editarRiscos: false, editarPlanos: false, verAuditoria: false, auditar: false },
  analista_grc: { editarRiscos: true, editarPlanos: true, verAuditoria: true, auditar: false },
  coordenador: { editarRiscos: true, editarPlanos: false, verAuditoria: true, auditar: true },
  gerente: { editarRiscos: true, editarPlanos: false, verAuditoria: true, auditar: true },
  administrador: { editarRiscos: true, editarPlanos: true, verAuditoria: true, auditar: true },
};

export function parsePerfilRiscos(metadata: Record<string, unknown>): PerfilRiscos {
  const v = metadata.perfilRiscos;
  if (v === "analista_grc" || v === "coordenador" || v === "gerente" || v === "administrador") return v;
  if (v === "gestor") return "gerente";
  if (v === "analista_senior") return "analista_grc";
  return "usuario";
}

export function permissoesDoPerfil(perfil: PerfilRiscos): PermissoesRiscos {
  return PERMISSOES[perfil];
}

export type UsuarioRiscos = {
  email: string;
  nome: string;
  perfil: PerfilRiscos;
  permissoes: PermissoesRiscos;
  /** Atalho mantido por compatibilidade: pode classificar conformidade. */
  podeAuditar: boolean;
};

export async function getUsuarioRiscos(): Promise<UsuarioRiscos | null> {
  const user = await currentUser();
  if (!user) return null;
  const perfil = parsePerfilRiscos((user.publicMetadata ?? {}) as Record<string, unknown>);
  const email =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    "";
  const permissoes = permissoesDoPerfil(perfil);
  return { email, nome: user.fullName || email || "Usuário", perfil, permissoes, podeAuditar: permissoes.auditar };
}

const MENSAGEM_SEM_PERMISSAO: Record<keyof PermissoesRiscos, string> = {
  editarRiscos: "Seu perfil não permite cadastrar ou editar riscos.",
  editarPlanos: "Seu perfil não permite cadastrar ou editar planos de ação.",
  verAuditoria: "Seu perfil não tem acesso às informações de auditoria.",
  auditar: "Somente coordenador, gerente ou administrador podem aplicar validações de conformidade.",
};

/**
 * Confere login e permissão numa rota de API. Devolve o usuário, ou uma
 * resposta 401/403 pronta para ser retornada.
 */
export async function exigirPermissao(
  permissao: keyof PermissoesRiscos
): Promise<{ usuario: UsuarioRiscos; resposta: null } | { usuario: null; resposta: NextResponse }> {
  const usuario = await getUsuarioRiscos();
  if (!usuario) {
    return { usuario: null, resposta: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) };
  }
  if (!usuario.permissoes[permissao]) {
    return {
      usuario: null,
      resposta: NextResponse.json({ error: MENSAGEM_SEM_PERMISSAO[permissao] }, { status: 403 }),
    };
  }
  return { usuario, resposta: null };
}
