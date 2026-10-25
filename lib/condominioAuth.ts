import { currentUser } from "@clerk/nextjs/server";

// Papel do usuário dentro do módulo de Gestão de Condomínio. Guardado no
// publicMetadata do Clerk (Dashboard > Users > selecionar usuário > Metadata
// > Public), já que o projeto não tem uma tabela própria de usuários —
// mesmo padrão usado pra controlar quem pode logar (Clerk > Restrictions).
//
// Chaves esperadas no publicMetadata:
//   perfilCondominio: "sindico" | "conselheiro" | "condomino"
//   unidadeCondominio: string (ex.: "Bloco 2, Apto 304")
//
// Sem perfilCondominio definido, o usuário é tratado como condômino —
// perfil menos privilegiado, nunca o contrário.
export type PerfilCondominio = "sindico" | "conselheiro" | "condomino";

export type UsuarioCondominio = {
  email: string;
  nome: string;
  perfil: PerfilCondominio;
  unidade: string | null;
};

export async function getUsuarioCondominio(): Promise<UsuarioCondominio | null> {
  const user = await currentUser();
  if (!user) return null;

  const metadata = (user.publicMetadata ?? {}) as Record<string, unknown>;
  const perfilBruto = metadata.perfilCondominio;
  const perfil: PerfilCondominio =
    perfilBruto === "sindico" || perfilBruto === "conselheiro" ? perfilBruto : "condomino";

  const email = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress
    ?? user.emailAddresses[0]?.emailAddress
    ?? "";

  return {
    email,
    nome: user.fullName || email || "Usuário",
    perfil,
    unidade: typeof metadata.unidadeCondominio === "string" ? metadata.unidadeCondominio : null,
  };
}

export function podeGerirChamados(perfil: PerfilCondominio): boolean {
  return perfil === "sindico" || perfil === "conselheiro";
}
