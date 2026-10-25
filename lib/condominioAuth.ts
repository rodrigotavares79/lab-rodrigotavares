import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { enviarAvisoPrazoConselheiroAdmin } from "@/lib/condominioEmail";

// Papel do usuário dentro do módulo de Gestão de Condomínio. Guardado no
// publicMetadata do Clerk (Dashboard > Users > selecionar usuário > Metadata
// > Public), já que o projeto não tem uma tabela própria de usuários —
// mesmo padrão usado pra controlar quem pode logar (Clerk > Restrictions).
//
// Chaves esperadas no publicMetadata:
//   perfilCondominio: "sindico" | "conselheiro" | "conselheiro_admin" | "condomino"
//   unidadeCondominio: string (ex.: "Bloco 2, Apto 304")
//   conselheiroAdminPrazoAte: string ISO — só existe enquanto perfilCondominio = conselheiro_admin
//   conselheiroAdminAvisado: boolean — já recebeu o e-mail de aviso de prazo (ciclo atual)
//
// Regras de negócio (ver README):
//   - Só pode existir 1 síndico e 1 conselheiro-admin por vez.
//   - Conselheiro-admin tem as funções de condômino, mais o poder (temporário,
//     30 dias úteis, renovável) de cadastrar um novo síndico. Em tudo mais que
//     é exclusivo de síndico, ele só visualiza.
export type PerfilCondominio = "sindico" | "conselheiro" | "conselheiro_admin" | "condomino";

export type UsuarioCondominio = {
  id: string;
  email: string;
  nome: string;
  perfil: PerfilCondominio;
  unidade: string | null;
  conselheiroAdminPrazoAte: string | null;
  diasUteisRestantes: number | null;
  conselheiroAdminPrazoValido: boolean;
};

// --- Dias úteis (segunda a sexta, sem calendário de feriados) ---

function ehFimDeSemana(data: Date): boolean {
  const dia = data.getUTCDay();
  return dia === 0 || dia === 6;
}

export function adicionarDiasUteis(base: Date, diasUteis: number): Date {
  const resultado = new Date(base);
  let restantes = diasUteis;
  while (restantes > 0) {
    resultado.setUTCDate(resultado.getUTCDate() + 1);
    if (!ehFimDeSemana(resultado)) restantes -= 1;
  }
  return resultado;
}

export function diasUteisRestantesAte(prazo: Date, agora: Date): number {
  if (prazo <= agora) return 0;
  let dias = 0;
  const cursor = new Date(agora);
  while (cursor < prazo) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (!ehFimDeSemana(cursor) && cursor <= prazo) dias += 1;
  }
  return dias;
}

// --- Leitura pura do metadata (sem efeito colateral) — usada tanto pro
// usuário logado quanto pra listar outros usuários em Manutenção de Condôminos ---

export function parsePerfilCondominio(metadata: Record<string, unknown>): PerfilCondominio {
  const v = metadata.perfilCondominio;
  return v === "sindico" || v === "conselheiro" || v === "conselheiro_admin" ? v : "condomino";
}

export function calcularPrazoConselheiroAdmin(metadata: Record<string, unknown>, agora: Date) {
  const prazoBruto = metadata.conselheiroAdminPrazoAte;
  const prazoISO = typeof prazoBruto === "string" ? prazoBruto : null;
  if (!prazoISO) {
    return { prazoISO: null as string | null, diasUteisRestantes: null as number | null, prazoValido: false };
  }
  const prazoData = new Date(prazoISO);
  return {
    prazoISO,
    diasUteisRestantes: diasUteisRestantesAte(prazoData, agora),
    prazoValido: prazoData.getTime() >= agora.getTime(),
  };
}

// --- Usuário logado ---

export async function getUsuarioCondominio(): Promise<UsuarioCondominio | null> {
  const user = await currentUser();
  if (!user) return null;

  const metadata = (user.publicMetadata ?? {}) as Record<string, unknown>;
  const perfil = parsePerfilCondominio(metadata);
  const email =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress
    ?? user.emailAddresses[0]?.emailAddress
    ?? "";
  const nome = user.fullName || email || "Usuário";
  const unidade = typeof metadata.unidadeCondominio === "string" ? metadata.unidadeCondominio : null;

  const agora = new Date();
  const { prazoISO, diasUteisRestantes, prazoValido } = calcularPrazoConselheiroAdmin(metadata, agora);

  // Dispara o aviso (e-mail + marca como avisado) quando o próprio
  // conselheiro-admin entra no sistema dentro da janela de 7 dias úteis.
  // Só acontece uma vez por ciclo de prazo — renovar o prazo zera o aviso.
  if (perfil === "conselheiro_admin" && prazoValido && diasUteisRestantes !== null && diasUteisRestantes <= 7) {
    const jaAvisado = metadata.conselheiroAdminAvisado === true;
    if (!jaAvisado) {
      try {
        await enviarAvisoPrazoConselheiroAdmin(email, nome, diasUteisRestantes, new Date(prazoISO!));
        const client = await clerkClient();
        await client.users.updateUserMetadata(user.id, {
          publicMetadata: { conselheiroAdminAvisado: true },
        });
      } catch (err) {
        console.error("Falha ao notificar prazo de conselheiro-admin:", err);
      }
    }
  }

  return {
    id: user.id,
    email,
    nome,
    perfil,
    unidade,
    conselheiroAdminPrazoAte: prazoISO,
    diasUteisRestantes,
    conselheiroAdminPrazoValido: prazoValido,
  };
}

// Edita (criar tipo/fornecedor, resolver chamado, convidar/editar condômino).
export function podeGerirChamados(perfil: PerfilCondominio): boolean {
  return perfil === "sindico" || perfil === "conselheiro";
}

// Enxerga as telas administrativas (dashboard, todos os chamados, lista de
// condôminos) — síndico e conselheiro editam; conselheiro-admin só visualiza.
export function podeVisualizarAdmin(perfil: PerfilCondominio): boolean {
  return perfil === "sindico" || perfil === "conselheiro" || perfil === "conselheiro_admin";
}

export function podeCadastrarSindico(usuario: UsuarioCondominio): boolean {
  return usuario.perfil === "conselheiro_admin" && usuario.conselheiroAdminPrazoValido;
}
