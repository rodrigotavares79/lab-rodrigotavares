import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import {
  getUsuarioCondominio,
  podeGerirChamados,
  parsePerfilCondominio,
  adicionarDiasUteis,
  type PerfilCondominio,
} from "@/lib/condominioAuth";

export const dynamic = "force-dynamic";

const PERFIS_VALIDOS: PerfilCondominio[] = ["sindico", "conselheiro", "conselheiro_admin", "condomino"];

// Edita perfil/unidade de um condômino já existente. Conselheiro-Admin não
// edita ninguém (nem a si mesmo) por aqui — só visualiza; a única ação dele
// é a rota dedicada de cadastrar síndico, e renovar seu próprio prazo.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const usuario = await getUsuarioCondominio();
    if (!usuario || !podeGerirChamados(usuario.perfil)) {
      return NextResponse.json({ error: "Só o síndico ou conselheiro altera o perfil de um condômino." }, { status: 403 });
    }

    const { id } = params;
    const { perfil, unidade } = await request.json();
    if (!PERFIS_VALIDOS.includes(perfil)) {
      return NextResponse.json({ error: `Perfil inválido. Use um de: ${PERFIS_VALIDOS.join(", ")}.` }, { status: 400 });
    }

    const client = await clerkClient();
    const alvo = await client.users.getUser(id);
    const metadataAtual = (alvo.publicMetadata ?? {}) as Record<string, unknown>;
    const perfilAnterior = parsePerfilCondominio(metadataAtual);

    if ((perfil === "sindico" || perfil === "conselheiro_admin") && perfilAnterior !== perfil) {
      const { data: clerkUsers } = await client.users.getUserList({ limit: 200 });
      const jaExiste = clerkUsers.some(
        (u) => u.id !== id && parsePerfilCondominio((u.publicMetadata ?? {}) as Record<string, unknown>) === perfil
      );
      if (jaExiste) {
        const mensagem =
          perfil === "sindico"
            ? "Já existe um síndico cadastrado. Para trocar, cadastre um conselheiro-admin e use a ação \"Cadastrar Síndico\"."
            : "Já existe um conselheiro-admin ativo. Renove o prazo dele em vez de eleger outro.";
        return NextResponse.json({ error: mensagem }, { status: 409 });
      }
    }

    const publicMetadata: Record<string, unknown> = {
      perfilCondominio: perfil,
      unidadeCondominio: unidade || null,
    };

    if (perfil === "conselheiro_admin" && perfilAnterior !== "conselheiro_admin") {
      // Nova eleição — abre um prazo novo de 30 dias úteis.
      publicMetadata.conselheiroAdminPrazoAte = adicionarDiasUteis(new Date(), 30).toISOString();
      publicMetadata.conselheiroAdminAvisado = false;
    } else if (perfil !== "conselheiro_admin" && perfilAnterior === "conselheiro_admin") {
      // Saiu do papel — limpa o prazo, não deixa rastro de um ciclo antigo.
      publicMetadata.conselheiroAdminPrazoAte = null;
      publicMetadata.conselheiroAdminAvisado = false;
    }

    await client.users.updateUserMetadata(id, { publicMetadata });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    const mensagem = err?.errors?.[0]?.longMessage || "Erro ao atualizar o usuário.";
    return NextResponse.json({ error: mensagem }, { status: 500 });
  }
}
