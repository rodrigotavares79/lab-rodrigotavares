import { NextRequest, NextResponse } from "next/server";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { podeAlterarPergunta, validarPergunta } from "@/lib/assessmentRegras";

export const dynamic = "force-dynamic";

// B29 · PATCH: altera texto e tipo (só sem respostas) ou ativa/desativa a
// pergunta (Administrador e CISO). Corpo: { texto?, tipo?, ativa? }.
// Pergunta não se exclui: desativada, sai dos assessments novos e dos que
// estão em andamento; quem já respondeu mantém a resposta.
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("gerirUsuarios");
  if (guarda.resposta) return guarda.resposta;
  const { id } = await props.params;
  if (!/^\d+$/.test(id ?? "")) return NextResponse.json({ error: "Pergunta inválida." }, { status: 400 });
  try {
    const d = await request.json().catch(() => ({}));
    const sql = sqlAuditado(guarda.usuario);
    const [p] = await sql`
      SELECT p.id, p.area, p.texto, p.tipo, p.ativa,
             (SELECT COUNT(*) FROM assessment_respostas r WHERE r.pergunta_id = p.id)::int AS respostas
      FROM assessment_perguntas p WHERE p.id = ${Number(id)}
    `;
    if (!p) return NextResponse.json({ error: "Pergunta não encontrada." }, { status: 404 });

    let texto = p.texto as string;
    let tipo = p.tipo as string;
    const mudaConteudo = (d.texto !== undefined && String(d.texto).trim() !== p.texto) || (d.tipo !== undefined && d.tipo !== p.tipo);
    if (mudaConteudo) {
      const bloqueio = podeAlterarPergunta(p.respostas);
      if (bloqueio) return NextResponse.json({ error: bloqueio }, { status: 409 });
      const erro = validarPergunta({ area: p.area, texto: d.texto ?? p.texto, tipo: d.tipo ?? p.tipo });
      if (erro) return NextResponse.json({ error: erro }, { status: 400 });
      texto = String(d.texto ?? p.texto).trim().replace(/\s+/g, " ");
      tipo = d.tipo ?? p.tipo;
    }
    const ativa = typeof d.ativa === "boolean" ? d.ativa : p.ativa;
    await sql`UPDATE assessment_perguntas SET texto = ${texto}, tipo = ${tipo}, ativa = ${ativa} WHERE id = ${p.id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao alterar a pergunta." }, { status: 500 });
  }
}
