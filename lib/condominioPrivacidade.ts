import { clerkClient } from "@clerk/nextjs/server";
import { parsePerfilCondominio, podeVisualizarAdmin, type UsuarioCondominio } from "@/lib/condominioAuth";

// Privacidade em chamados globais ("visíveis a todos").
//
// Um chamado global aparece para todos os condôminos, mas os dados de quem o
// abriu — nome, unidade, e-mail — e as fotos/PDFs enviados por outros
// moradores continuam restritos ao próprio autor e à administração
// (síndico, conselheiro e conselheiro-admin). Os demais condôminos veem o
// problema, o andamento e as respostas da administração, com o autor
// identificado só como "Morador".

export const ROTULO_MORADOR = "Morador";

type ChamadoBase = { aberto_por_email?: string | null };

// true quando quem está vendo é um condômino que NÃO abriu o chamado —
// ou seja, só está enxergando o chamado porque ele é global.
export function emVisaoRestrita(usuario: UsuarioCondominio, chamado: ChamadoBase): boolean {
  return !podeVisualizarAdmin(usuario.perfil) && chamado.aberto_por_email !== usuario.email;
}

// Remove os dados pessoais do autor de uma linha de chamado.
export function mascararAutorDoChamado<T extends Record<string, unknown>>(chamado: T): T {
  return {
    ...chamado,
    aberto_por_nome: ROTULO_MORADOR,
    aberto_por_unidade: null,
    aberto_por_email: undefined,
  };
}

// Descobre, entre os e-mails informados, quais pertencem à administração
// (síndico, conselheiro, conselheiro-admin). Usado para manter visível o
// nome de quem respondeu pela administração e ocultar o de moradores.
export async function emailsDaAdministracao(emails: (string | null | undefined)[]): Promise<Set<string>> {
  const unicos = Array.from(new Set(emails.filter((e): e is string => !!e)));
  const resultado = new Set<string>();
  if (unicos.length === 0) return resultado;

  const client = await clerkClient();
  const { data } = await client.users.getUserList({ emailAddress: unicos, limit: 100 });
  for (const u of data) {
    const perfil = parsePerfilCondominio((u.publicMetadata ?? {}) as Record<string, unknown>);
    if (!podeVisualizarAdmin(perfil)) continue;
    for (const e of u.emailAddresses) {
      if (unicos.includes(e.emailAddress)) resultado.add(e.emailAddress);
    }
  }
  return resultado;
}

// Nome a exibir para um autor (de mensagem, anexo ou movimentação) quando o
// condômino está em visão restrita: ele mesmo e a administração aparecem
// pelo nome; qualquer outro morador vira "Morador".
export function nomeVisivel(
  autorEmail: string | null | undefined,
  autorNome: string | null | undefined,
  usuario: UsuarioCondominio,
  administracao: Set<string>
): string | null {
  if (!autorEmail) return autorNome ?? null;
  if (autorEmail === usuario.email || administracao.has(autorEmail)) return autorNome ?? null;
  return ROTULO_MORADOR;
}
