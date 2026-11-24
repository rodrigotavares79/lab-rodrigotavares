import { currentUser } from "@clerk/nextjs/server";

// Papel do usuário no Gestão de Riscos, guardado no publicMetadata do Clerk
// (Dashboard > Users > usuário > Metadata > Public), no mesmo padrão do
// Condomínio. Chave esperada:
//   perfilRiscos: "gestor" | "coordenador" | "analista_senior"
// Quem não tem a chave usa o sistema normalmente, mas não audita planos.

export type PerfilRiscos = "gestor" | "coordenador" | "analista_senior" | null;

export const ROTULO_PERFIL_RISCOS: Record<Exclude<PerfilRiscos, null>, string> = {
  gestor: "Gestor da área",
  coordenador: "Coordenador",
  analista_senior: "Analista sênior de SI",
};

export type UsuarioRiscos = {
  email: string;
  nome: string;
  perfil: PerfilRiscos;
  podeAuditar: boolean;
};

export function parsePerfilRiscos(metadata: Record<string, unknown>): PerfilRiscos {
  const v = metadata.perfilRiscos;
  return v === "gestor" || v === "coordenador" || v === "analista_senior" ? v : null;
}

export async function getUsuarioRiscos(): Promise<UsuarioRiscos | null> {
  const user = await currentUser();
  if (!user) return null;
  const perfil = parsePerfilRiscos((user.publicMetadata ?? {}) as Record<string, unknown>);
  const email =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    "";
  return {
    email,
    nome: user.fullName || email || "Usuário",
    perfil,
    podeAuditar: perfil !== null,
  };
}
