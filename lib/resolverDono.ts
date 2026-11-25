import { listarUsuariosRiscos, type UsuarioResponsavel } from "@/lib/usuariosRiscos";
import { resolverPontoFocal } from "@/lib/donoRisco";
import { MSG_SEM_DONO } from "@/lib/ativosCriticos";

// B14 · Resolve o dono do risco a partir do que veio do formulário:
// { donoContatoId } → contato de negócio (exige ponto focal Analista GRC);
// { donoEmail }     → usuário do módulo (sem ponto focal).
// Devolve as colunas para gravar em riscos, ou a mensagem de erro.

export type DonoResolvido = {
  dono_email: string;
  dono_nome: string;
  dono_contato_id: number | null;
  ponto_focal_email: string | null;
  ponto_focal_nome: string | null;
};

export async function resolverDonoRisco(
  sql: any,
  entrada: { donoEmail?: unknown; donoContatoId?: unknown; pontoFocalEmail?: unknown },
  usuarios?: UsuarioResponsavel[]
): Promise<{ erro: string } | { dono: DonoResolvido }> {
  const lista = usuarios ?? (await listarUsuariosRiscos());
  const contatoId =
    entrada.donoContatoId !== undefined && entrada.donoContatoId !== null && entrada.donoContatoId !== ""
      ? Number(entrada.donoContatoId)
      : null;

  if (contatoId !== null) {
    if (!Number.isInteger(contatoId)) return { erro: "Contato inválido." };
    const [contato] = await sql`SELECT id, nome, email, ativo FROM contatos_risco WHERE id = ${contatoId}`;
    if (!contato) return { erro: "Contato não encontrado." };
    if (!contato.ativo) return { erro: "Este contato está inativo." };
    const pf = resolverPontoFocal(lista, entrada.pontoFocalEmail);
    if ("erro" in pf) return { erro: pf.erro };
    return {
      dono: {
        dono_email: contato.email,
        dono_nome: contato.nome,
        dono_contato_id: contato.id,
        ponto_focal_email: pf.pontoFocal.email,
        ponto_focal_nome: pf.pontoFocal.nome,
      },
    };
  }

  const email = typeof entrada.donoEmail === "string" ? entrada.donoEmail.trim().toLowerCase() : "";
  if (!email) return { erro: MSG_SEM_DONO };
  const usuario = lista.find((u) => u.email.toLowerCase() === email);
  if (!usuario) {
    return { erro: "O dono precisa ser um usuário do sistema ou um contato cadastrado em \"Contatos de negócio\"." };
  }
  return {
    dono: {
      dono_email: usuario.email,
      dono_nome: usuario.nome,
      dono_contato_id: null,
      ponto_focal_email: null,
      ponto_focal_nome: null,
    },
  };
}
