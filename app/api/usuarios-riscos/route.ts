import { NextResponse } from "next/server";
import { exigirPermissao } from "@/lib/riscosAuth";
import { listarUsuariosRiscos } from "@/lib/usuariosRiscos";

export const dynamic = "force-dynamic";

// GET: usuários que podem ser responsáveis por ações (B09). Só para quem
// cadastra e edita planos de ação.
export async function GET() {
  const guarda = await exigirPermissao("editarPlanos");
  if (guarda.resposta) return guarda.resposta;
  try {
    return NextResponse.json({ usuarios: await listarUsuariosRiscos() });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar os usuários." }, { status: 500 });
  }
}
