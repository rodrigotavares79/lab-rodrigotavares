import { clerkClient } from "@clerk/nextjs/server";
import { parsePerfilRiscos, permissoesDoPerfil, ROTULO_PERFIL_RISCOS } from "@/lib/perfisRiscos";

// Usuários que podem ser responsáveis por ações do Gestão de Riscos (B09):
// contas do Clerk com acesso ao módulo (chave `perfilRiscos`, qualquer perfil
// exceto "sem_acesso" — ver lib/perfisRiscos). Isso deixa de fora quem só usa
// outros módulos do lab, como o Gestão de Condomínio.

// `perfil` é o rótulo para exibir; `chave` é o perfil técnico (ex.: "analista_grc").
export type UsuarioResponsavel = { email: string; nome: string; perfil: string; chave: string };

export async function listarUsuariosRiscos(): Promise<UsuarioResponsavel[]> {
  const client = await clerkClient();
  const { data } = await client.users.getUserList({ limit: 200 });
  return data
    .filter(
      (u) =>
        !u.banned &&
        permissoesDoPerfil(parsePerfilRiscos(u.publicMetadata as Record<string, unknown>)).ler
    )
    .map((u) => {
      const email =
        u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ??
        u.emailAddresses[0]?.emailAddress ??
        "";
      const perfil = parsePerfilRiscos(u.publicMetadata as Record<string, unknown>);
      return { email, nome: u.fullName || email, perfil: ROTULO_PERFIL_RISCOS[perfil], chave: perfil as string };
    })
    .filter((u) => u.email)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Confere um e-mail contra a lista; devolve o usuário ou null. */
export async function buscarUsuarioRiscos(email: unknown): Promise<UsuarioResponsavel | null> {
  if (typeof email !== "string" || !email.trim()) return null;
  const alvo = email.trim().toLowerCase();
  const usuarios = await listarUsuariosRiscos();
  return usuarios.find((u) => u.email.toLowerCase() === alvo) ?? null;
}
