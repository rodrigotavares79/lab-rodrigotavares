import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { getUsuarioCondominio, podeCadastrarSindico, parsePerfilCondominio } from "@/lib/condominioAuth";

export const dynamic = "force-dynamic";

const DESTINOS_VALIDOS = ["conselheiro", "condomino", "inativo"] as const;
type Destino = (typeof DESTINOS_VALIDOS)[number];

// Ação exclusiva do conselheiro-admin, dentro do prazo de 30 dias úteis:
// promove um condômino a síndico e decide o que fazer com o síndico atual
// (rebaixar pra conselheiro/condômino, ou inativar — caso de síndico
// profissional que não é morador). O destino é decidido aqui, não é uma
// regra fixa do sistema: depende da assembleia.
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioCondominio();
    if (!usuario || !podeCadastrarSindico(usuario)) {
      return NextResponse.json(
        { error: "Só o conselheiro-admin, dentro do prazo, pode cadastrar um novo síndico." },
        { status: 403 }
      );
    }

    const { novoSindicoUserId, destinoSindicoAtual } = await request.json();
    if (!novoSindicoUserId || typeof novoSindicoUserId !== "string") {
      return NextResponse.json({ error: "Selecione o condômino que vai virar síndico." }, { status: 400 });
    }
    if (destinoSindicoAtual && !DESTINOS_VALIDOS.includes(destinoSindicoAtual)) {
      return NextResponse.json(
        { error: `Destino inválido para o síndico atual. Use um de: ${DESTINOS_VALIDOS.join(", ")}.` },
        { status: 400 }
      );
    }

    const client = await clerkClient();
    const { data: clerkUsers } = await client.users.getUserList({ limit: 200 });

    const novoSindico = clerkUsers.find((u) => u.id === novoSindicoUserId);
    if (!novoSindico) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }
    if (parsePerfilCondominio((novoSindico.publicMetadata ?? {}) as Record<string, unknown>) === "sindico") {
      return NextResponse.json({ error: "Este usuário já é o síndico." }, { status: 400 });
    }

    const sindicoAtual = clerkUsers.find(
      (u) => parsePerfilCondominio((u.publicMetadata ?? {}) as Record<string, unknown>) === "sindico"
    );

    if (sindicoAtual) {
      const destino: Destino = destinoSindicoAtual || "condomino";
      if (destino === "inativo") {
        await client.users.banUser(sindicoAtual.id);
        await client.users.updateUserMetadata(sindicoAtual.id, {
          publicMetadata: { perfilCondominio: "condomino" },
        });
      } else {
        await client.users.updateUserMetadata(sindicoAtual.id, {
          publicMetadata: { perfilCondominio: destino },
        });
      }
    }

    await client.users.updateUserMetadata(novoSindicoUserId, {
      publicMetadata: { perfilCondominio: "sindico" },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    const mensagem = err?.errors?.[0]?.longMessage || "Erro ao cadastrar o novo síndico.";
    return NextResponse.json({ error: mensagem }, { status: 500 });
  }
}
