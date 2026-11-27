import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { exigirPermissao } from "@/lib/riscosAuth";
import { validarConvite, ROTULO_PERFIL_RISCOS, type PerfilRiscos } from "@/lib/perfisRiscos";
import { convidar, historicoUsuarios, listarConvitesPendentes, listarUsuariosAdmin, registrarNaTrilha } from "@/lib/usuariosAdmin";

export const dynamic = "force-dynamic";

// Usuários e perfis do Gestão de Riscos. Só Administrador e CISO.
// GET: contas, convites pendentes e histórico. POST: convida por e-mail.
export async function GET() {
  const guarda = await exigirPermissao("gerirUsuarios");
  if (guarda.resposta) return guarda.resposta;
  try {
    const { userId } = await auth();
    const [usuarios, convites, historico] = await Promise.all([listarUsuariosAdmin(), listarConvitesPendentes(), historicoUsuarios()]);
    return NextResponse.json({
      usuarios,
      convites,
      historico,
      eu: { id: userId, perfil: guarda.usuario.perfil },
      rotulos: ROTULO_PERFIL_RISCOS,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar os usuários." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const guarda = await exigirPermissao("gerirUsuarios");
  if (guarda.resposta) return guarda.resposta;
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : body.email;
    const erro = validarConvite({ ator: guarda.usuario.perfil, email, perfil: body.perfil });
    if (erro) return NextResponse.json({ error: erro }, { status: 400 });

    const [usuarios, convites] = await Promise.all([listarUsuariosAdmin(), listarConvitesPendentes()]);
    if (usuarios.some((u) => u.email.toLowerCase() === email)) {
      return NextResponse.json({ error: "Já existe uma conta com esse e-mail. Altere o perfil dela na lista de usuários." }, { status: 409 });
    }
    if (convites.some((c) => c.email.toLowerCase() === email)) {
      return NextResponse.json({ error: "Já há um convite pendente para esse e-mail." }, { status: 409 });
    }

    const destino = `${request.nextUrl.origin}/seguranca/gestao-de-riscos`;
    const convite = await convidar(email, body.perfil as PerfilRiscos, destino);
    await registrarNaTrilha({
      autor: guarda.usuario,
      registroId: convite.id,
      operacao: "INSERT",
      campo: "convite",
      anterior: null,
      novo: { email, perfil: body.perfil },
    });
    return NextResponse.json({ convite }, { status: 201 });
  } catch (err: any) {
    console.error(err);
    const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message;
    return NextResponse.json({ error: msg ? `O Clerk recusou o convite: ${msg}` : "Erro ao enviar o convite." }, { status: 500 });
  }
}
