import { NextRequest, NextResponse } from "next/server";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { normalizarNomeProjeto, projetoComMesmoNome, validarNomeProjeto } from "@/lib/projetosRegras";

export const dynamic = "force-dynamic";

// B29 · PATCH: renomeia, altera a descrição, desativa ou reativa um projeto
// (Administrador e CISO). Projeto não se exclui: riscos e assessments ligados
// a ele continuam no histórico. Corpo: { nome?, descricao?, ativo? }.
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("gerirUsuarios");
  if (guarda.resposta) return guarda.resposta;
  const { id } = await props.params;
  if (!/^\d+$/.test(id ?? "")) return NextResponse.json({ error: "Projeto inválido." }, { status: 400 });
  try {
    const d = await request.json().catch(() => ({}));
    const sql = sqlAuditado(guarda.usuario);
    const [atual] = await sql`SELECT id, nome, descricao, ativo FROM projetos WHERE id = ${Number(id)}`;
    if (!atual) return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });

    let nome = atual.nome as string;
    if (d.nome !== undefined) {
      const erro = validarNomeProjeto(d.nome);
      if (erro) return NextResponse.json({ error: erro }, { status: 400 });
      nome = normalizarNomeProjeto(d.nome);
      const existentes = (await sql`SELECT id, nome FROM projetos`) as { id: number; nome: string }[];
      const igual = projetoComMesmoNome(nome, existentes, atual.id);
      if (igual) return NextResponse.json({ error: `Já existe o projeto "${igual.nome}".` }, { status: 409 });
    }
    const descricao = d.descricao === undefined ? atual.descricao : typeof d.descricao === "string" && d.descricao.trim() ? d.descricao.trim().slice(0, 1000) : null;
    const ativo = typeof d.ativo === "boolean" ? d.ativo : atual.ativo;
    await sql`UPDATE projetos SET nome = ${nome}, descricao = ${descricao}, ativo = ${ativo} WHERE id = ${atual.id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao alterar o projeto." }, { status: 500 });
  }
}
