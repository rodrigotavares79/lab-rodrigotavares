import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { exigirPermissao } from "@/lib/riscosAuth";
import { validarMudancaPerfil, type PerfilRiscos } from "@/lib/perfisRiscos";
import { definirPerfil, listarUsuariosAdmin, obterUsuarioAdmin, registrarNaTrilha } from "@/lib/usuariosAdmin";

export const dynamic = "force-dynamic";

// PATCH { perfil }: muda o perfil de uma conta no Gestão de Riscos.
// perfil = "sem_acesso" remove o acesso ao módulo (a conta continua no lab).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("gerirUsuarios");
  if (guarda.resposta) return guarda.resposta;
  try {
    const { id } = await params;
    const { userId } = await auth();
    const body = await request.json().catch(() => ({}));
    const alvo = await obterUsuarioAdmin(id);
    if (!alvo) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

    const administradores = (await listarUsuariosAdmin()).filter((u) => u.perfil === "administrador" && !u.bloqueado).length;
    const erro = validarMudancaPerfil({
      ator: guarda.usuario.perfil,
      atorId: userId ?? "",
      alvoId: alvo.id,
      atual: alvo.perfil,
      novo: body.perfil,
      administradores,
      porGrupo: alvo.porGrupo,
    });
    if (erro) return NextResponse.json({ error: erro }, { status: 400 });

    await definirPerfil(alvo.id, body.perfil as PerfilRiscos);
    await registrarNaTrilha({
      autor: guarda.usuario,
      registroId: alvo.id,
      operacao: "UPDATE",
      campo: "perfilRiscos",
      anterior: { email: alvo.email, perfil: alvo.perfil },
      novo: { email: alvo.email, perfil: body.perfil },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao alterar o perfil." }, { status: 500 });
  }
}
