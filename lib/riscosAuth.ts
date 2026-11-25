import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

// Perfis e matriz de permissões: lib/perfisRiscos.ts (B11), documentados em
// docs/matriz-permissoes.md. Aqui ficam só a leitura do usuário no Clerk e a
// checagem nas rotas de API.

import {
  MENSAGEM_SEM_PERMISSAO,
  parsePerfilRiscos,
  permissoesDoPerfil,
  ROTULO_PERFIL_RISCOS,
  type PerfilRiscos,
  type PermissoesRiscos,
} from "@/lib/perfisRiscos";

export { parsePerfilRiscos, permissoesDoPerfil, ROTULO_PERFIL_RISCOS };
export type { PerfilRiscos, PermissoesRiscos };

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
