import { NextResponse } from "next/server";
import { getUsuarioRiscos, ROTULO_PERFIL_RISCOS } from "@/lib/riscosAuth";

export const dynamic = "force-dynamic";

// Perfil e permissões do usuário logado no Gestão de Riscos (usado pela
// interface para mostrar ou esconder ações; a regra vale de fato nas rotas).
export async function GET() {
  const usuario = await getUsuarioRiscos();
  if (!usuario) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  return NextResponse.json({
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil,
    rotulo: ROTULO_PERFIL_RISCOS[usuario.perfil],
    permissoes: usuario.permissoes,
  });
}
