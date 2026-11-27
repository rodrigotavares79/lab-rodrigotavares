import { NextResponse } from "next/server";
import { exigirPermissao } from "@/lib/riscosAuth";
import { listarConvitesPendentes, registrarNaTrilha, revogarConvite } from "@/lib/usuariosAdmin";

export const dynamic = "force-dynamic";

// DELETE: cancela um convite pendente.
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("gerirUsuarios");
  if (guarda.resposta) return guarda.resposta;
  try {
    const { id } = await params;
    const convite = (await listarConvitesPendentes()).find((c) => c.id === id);
    if (!convite) return NextResponse.json({ error: "Convite não encontrado ou já usado." }, { status: 404 });
    if (convite.perfil === "administrador" && guarda.usuario.perfil !== "administrador") {
      return NextResponse.json({ error: "Só um Administrador cancela o convite de outro Administrador." }, { status: 400 });
    }
    await revogarConvite(id);
    await registrarNaTrilha({
      autor: guarda.usuario,
      registroId: id,
      operacao: "DELETE",
      campo: "convite",
      anterior: { email: convite.email, perfil: convite.perfil },
      novo: null,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao cancelar o convite." }, { status: 500 });
  }
}
