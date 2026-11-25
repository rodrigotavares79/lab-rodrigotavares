import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";
import { listarUsuariosRiscos } from "@/lib/usuariosRiscos";
import { analistasGrc } from "@/lib/donoRisco";

export const dynamic = "force-dynamic";

// B14 · Opções para o dono do risco: usuários do módulo e contatos de negócio
// ativos, mais os Analistas GRC que podem ser ponto focal. Para quem edita
// riscos.
export async function GET() {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const [usuarios, contatos] = await Promise.all([
      listarUsuariosRiscos(),
      sql`SELECT id, nome, email, area, cargo FROM contatos_risco WHERE ativo ORDER BY nome`,
    ]);
    return NextResponse.json({
      usuarios: usuarios.map(({ email, nome, perfil }) => ({ email, nome, perfil })),
      contatos,
      pontosFocais: analistasGrc(usuarios).map(({ email, nome }) => ({ email, nome })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar as opções de dono." }, { status: 500 });
  }
}
