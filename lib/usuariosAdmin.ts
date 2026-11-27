import { clerkClient } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";
import { parsePerfilRiscos, perfilPorGrupo, type PerfilRiscos } from "@/lib/perfisRiscos";

// Tela Usuários e perfis: leitura e escrita das contas no Clerk e registro de
// cada mudança na trilha de auditoria (log_alteracoes, tabela "usuarios").
// As regras (quem pode, o que pode) ficam em lib/perfisRiscos.ts.
//
// O perfil vive no publicMetadata do Clerk, chave `perfilRiscos`. O update
// faz merge dos metadados, então chaves de outros módulos do lab (como
// `perfilCondominio`) não são tocadas. Remover o acesso grava "sem_acesso"
// em vez de bloquear a conta, para não afetar os outros módulos.

export type UsuarioAdmin = {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilRiscos;
  porGrupo: boolean;
  bloqueado: boolean;
  criadoEm: string;
  ultimoAcesso: string | null;
};

export type ConviteAdmin = { id: string; email: string; perfil: PerfilRiscos; criadoEm: string };

const iso = (t: number | null | undefined) => (t ? new Date(t).toISOString() : null);

function emailDe(u: { emailAddresses: { id: string; emailAddress: string }[]; primaryEmailAddressId: string | null }) {
  return u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ?? u.emailAddresses[0]?.emailAddress ?? "";
}

/** Todas as contas do lab (até 500), com o perfil no Gestão de Riscos. */
export async function listarUsuariosAdmin(): Promise<UsuarioAdmin[]> {
  const client = await clerkClient();
  const todos: UsuarioAdmin[] = [];
  for (let offset = 0; offset < 500; offset += 100) {
    const { data } = await client.users.getUserList({ limit: 100, offset, orderBy: "-created_at" });
    for (const u of data) {
      const meta = (u.publicMetadata ?? {}) as Record<string, unknown>;
      const email = emailDe(u);
      todos.push({
        id: u.id,
        nome: u.fullName || email,
        email,
        perfil: parsePerfilRiscos(meta),
        porGrupo: perfilPorGrupo(meta),
        bloqueado: u.banned,
        criadoEm: iso(u.createdAt)!,
        ultimoAcesso: iso(u.lastActiveAt ?? u.lastSignInAt),
      });
    }
    if (data.length < 100) break;
  }
  return todos.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function obterUsuarioAdmin(id: string): Promise<UsuarioAdmin | null> {
  const client = await clerkClient();
  try {
    const u = await client.users.getUser(id);
    const meta = (u.publicMetadata ?? {}) as Record<string, unknown>;
    const email = emailDe(u);
    return {
      id: u.id,
      nome: u.fullName || email,
      email,
      perfil: parsePerfilRiscos(meta),
      porGrupo: perfilPorGrupo(meta),
      bloqueado: u.banned,
      criadoEm: iso(u.createdAt)!,
      ultimoAcesso: iso(u.lastActiveAt ?? u.lastSignInAt),
    };
  } catch {
    return null;
  }
}

export async function definirPerfil(id: string, perfil: PerfilRiscos): Promise<void> {
  const client = await clerkClient();
  await client.users.updateUserMetadata(id, { publicMetadata: { perfilRiscos: perfil } });
}

/** Convites pendentes que dão acesso ao Gestão de Riscos. */
export async function listarConvitesPendentes(): Promise<ConviteAdmin[]> {
  const client = await clerkClient();
  const { data } = await client.invitations.getInvitationList({ status: "pending", limit: 100 });
  return data
    .map((c) => ({
      id: c.id,
      email: c.emailAddress,
      perfil: parsePerfilRiscos((c.publicMetadata ?? {}) as Record<string, unknown>),
      criadoEm: iso(c.createdAt)!,
    }))
    .filter((c) => c.perfil !== "sem_acesso")
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

export async function convidar(email: string, perfil: PerfilRiscos, redirectUrl: string): Promise<ConviteAdmin> {
  const client = await clerkClient();
  const c = await client.invitations.createInvitation({
    emailAddress: email,
    publicMetadata: { perfilRiscos: perfil },
    redirectUrl,
    notify: true,
    expiresInDays: 7,
  });
  return { id: c.id, email: c.emailAddress, perfil, criadoEm: iso(c.createdAt)! };
}

export async function revogarConvite(id: string): Promise<void> {
  const client = await clerkClient();
  await client.invitations.revokeInvitation(id);
}

/**
 * Grava a mudança na trilha de auditoria (log_alteracoes, só inclusão). As
 * contas ficam no Clerk, então o registro é feito pela aplicação.
 */
export async function registrarNaTrilha(d: {
  autor: { email: string; nome: string };
  registroId: string;
  operacao: "INSERT" | "UPDATE" | "DELETE";
  campo: string;
  anterior: unknown;
  novo: unknown;
}): Promise<void> {
  const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
  await sql`
    INSERT INTO log_alteracoes (tabela, registro_id, operacao, campo, valor_anterior, valor_novo, usuario_email, usuario_nome, origem)
    VALUES ('usuarios', ${d.registroId}, ${d.operacao}, ${d.campo}, ${JSON.stringify(d.anterior ?? null)}::jsonb,
            ${JSON.stringify(d.novo ?? null)}::jsonb, ${d.autor.email || "desconhecido"}, ${d.autor.nome || null}, 'aplicacao')
  `;
}

/** Histórico recente de mudanças de usuários, para a tela. */
export async function historicoUsuarios(limite = 30) {
  const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
  return sql`
    SELECT ocorrido_em, registro_id, operacao, campo, valor_anterior, valor_novo, usuario_nome, usuario_email
    FROM log_alteracoes WHERE tabela = 'usuarios'
    ORDER BY ocorrido_em DESC LIMIT ${limite}
  `;
}
