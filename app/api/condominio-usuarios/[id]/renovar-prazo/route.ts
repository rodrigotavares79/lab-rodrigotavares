import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import {
  getUsuarioCondominio,
  podeGerirChamados,
  parsePerfilCondominio,
  adicionarDiasUteis,
} from "@/lib/condominioAuth";

export const dynamic = "force-dynamic";

// Renova os 30 dias úteis do conselheiro-admin. Quem pode: síndico/conselheiro
// (renovando qualquer um), ou o próprio conselheiro-admin renovando a si mesmo.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const usuario = await getUsuarioCondominio();
    if (!usuario) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { id } = params;
    const podeRenovar = podeGerirChamados(usuario.perfil) || (usuario.id === id && usuario.perfil === "conselheiro_admin");
    if (!podeRenovar) {
      return NextResponse.json({ error: "Você não pode renovar este prazo." }, { status: 403 });
    }

    const client = await clerkClient();
    const alvo = await client.users.getUser(id);
    const metadataAtual = (alvo.publicMetadata ?? {}) as Record<string, unknown>;
    if (parsePerfilCondominio(metadataAtual) !== "conselheiro_admin") {
      return NextResponse.json({ error: "Este usuário não é conselheiro-admin." }, { status: 400 });
    }

    const novoPrazo = adicionarDiasUteis(new Date(), 30).toISOString();
    await client.users.updateUserMetadata(id, {
      publicMetadata: { conselheiroAdminPrazoAte: novoPrazo, conselheiroAdminAvisado: false },
    });

    return NextResponse.json({ ok: true, conselheiroAdminPrazoAte: novoPrazo });
  } catch (err: any) {
    console.error(err);
    const mensagem = err?.errors?.[0]?.longMessage || "Erro ao renovar o prazo.";
    return NextResponse.json({ error: mensagem }, { status: 500 });
  }
}
