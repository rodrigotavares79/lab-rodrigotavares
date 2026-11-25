import { NextResponse } from "next/server";
import { exigirPermissao } from "@/lib/riscosAuth";
import { listarUsuariosRiscos } from "@/lib/usuariosRiscos";

export const dynamic = "force-dynamic";

// GET: usuários do módulo, para escolher o responsável por ações (B09) e o
// dono do risco (B14). Só para quem edita riscos ou planos de ação.
export async function GET() {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  if (!guarda.usuario.permissoes.editarRiscos && !guarda.usuario.permissoes.editarPlanos) {
    return NextResponse.json({ error: "Seu perfil não permite esta ação." }, { status: 403 });
  }
  try {
    return NextResponse.json({ usuarios: await listarUsuariosRiscos() });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar os usuários." }, { status: 500 });
  }
}
