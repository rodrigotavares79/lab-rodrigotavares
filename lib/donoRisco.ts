// B14 (complemento) · Dono do risco pode ser um usuário do módulo ou um
// contato de negócio sem acesso ao sistema. Quando o dono é contato, o risco
// tem um ponto focal interno, que é sempre um usuário com perfil Analista GRC:
// é quem atualiza o risco em nome do dono e responde pelas pendências.
//
// Sem imports: o módulo roda direto no `node --test`.

export const PERFIL_PONTO_FOCAL = "analista_grc";
export const ROTULO_PONTO_FOCAL = "Analista GRC";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type DadosContato = { nome?: unknown; email?: unknown; area?: unknown; cargo?: unknown };
export type ContatoNormalizado = { nome: string; email: string; area: string; cargo: string | null };

function limpo(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

export function validarContato(
  d: DadosContato,
  emailsDeUsuarios: string[] = []
): { erro: string } | { contato: ContatoNormalizado } {
  const nome = limpo(d.nome, 150);
  if (nome.length < 3) return { erro: "Informe o nome do contato (pelo menos 3 caracteres)." };
  const email = limpo(d.email, 200).toLowerCase();
  if (!EMAIL_RE.test(email)) return { erro: "Informe um e-mail válido para o contato." };
  if (emailsDeUsuarios.some((e) => e.toLowerCase() === email)) {
    return { erro: "Este e-mail já é de um usuário do sistema: escolha-o direto como dono, sem cadastrar contato." };
  }
  const area = limpo(d.area, 120);
  if (area.length < 2) return { erro: "Informe a área do contato." };
  const cargo = limpo(d.cargo, 120) || null;
  return { contato: { nome, email, area, cargo } };
}

type UsuarioMin = { email: string; nome: string; chave: string };

export function analistasGrc<T extends UsuarioMin>(usuarios: T[]): T[] {
  return usuarios.filter((u) => u.chave === PERFIL_PONTO_FOCAL);
}

// Resolve o ponto focal de um risco com dono externo. Com e-mail informado,
// ele precisa ser de um Analista GRC; sem e-mail, usa o único Analista GRC
// cadastrado (se houver mais de um, a escolha é obrigatória).
export function resolverPontoFocal<T extends UsuarioMin>(
  usuarios: T[],
  emailEscolhido: unknown
): { erro: string } | { pontoFocal: T } {
  const analistas = analistasGrc(usuarios);
  const email = typeof emailEscolhido === "string" ? emailEscolhido.trim().toLowerCase() : "";
  if (email) {
    const achado = analistas.find((u) => u.email.toLowerCase() === email);
    if (!achado) return { erro: `O ponto focal precisa ser um usuário com perfil ${ROTULO_PONTO_FOCAL}.` };
    return { pontoFocal: achado };
  }
  if (analistas.length === 1) return { pontoFocal: analistas[0] };
  if (analistas.length === 0) {
    return { erro: `Não há usuário com perfil ${ROTULO_PONTO_FOCAL} para ser o ponto focal deste risco.` };
  }
  return { erro: `Escolha o ponto focal (${ROTULO_PONTO_FOCAL}) do risco.` };
}
