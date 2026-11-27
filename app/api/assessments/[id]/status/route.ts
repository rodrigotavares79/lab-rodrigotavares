import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { validarTransicao } from "@/lib/assessmentRegras";
import { carregarAssessment, montarSnapshot } from "@/lib/assessmentServidor";

export const dynamic = "force-dynamic";

// B28 · POST: muda o status. Corpo: { para: "Em revisão" | "Concluído" | "Rascunho", motivo? }.
// - Enviar para revisão: sem pendências.
// - Concluir ou devolver: perfil com auditar, diferente de quem conduziu.
// - Concluir grava a foto (snapshot) do relatório e trava o assessment.
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  const { id } = await props.params;
  if (!/^\d+$/.test(id ?? "")) return NextResponse.json({ error: "Assessment inválido." }, { status: 400 });
  try {
    const d = await request.json().catch(() => ({}));
    const u = guarda.usuario;
    const leitura = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const dados = await carregarAssessment(leitura as any, Number(id));
    if (!dados) return NextResponse.json({ error: "Assessment não encontrado." }, { status: 404 });
    const a = dados.assessment;
    const motivo = typeof d?.motivo === "string" ? d.motivo.trim().slice(0, 2000) : null;
    const erro = validarTransicao({
      de: a.status,
      para: d?.para,
      ator: { email: u.email, editarRiscos: u.permissoes.editarRiscos, auditar: u.permissoes.auditar },
      analistaEmail: a.analista_email,
      pendentes: dados.pendentes,
      motivo,
    });
    if (erro) return NextResponse.json({ error: erro }, { status: 409 });

    const sql = sqlAuditado(u);
    let linhas: any[] = [];
    if (d.para === "Em revisão") {
      linhas = await sql`
        UPDATE assessments SET status = 'Em revisão', enviado_revisao_em = now(), devolvido_motivo = NULL, atualizado_em = now()
        WHERE id = ${a.id} AND status = 'Rascunho' RETURNING id
      `;
    } else if (d.para === "Rascunho") {
      linhas = await sql`
        UPDATE assessments SET status = 'Rascunho', devolvido_motivo = ${motivo}, revisor_email = ${u.email}, revisor_nome = ${u.nome}, atualizado_em = now()
        WHERE id = ${a.id} AND status = 'Em revisão' RETURNING id
      `;
    } else {
      const snapshot = montarSnapshot(dados, { email: u.email, nome: u.nome });
      linhas = await sql`
        UPDATE assessments SET status = 'Concluído', revisor_email = ${u.email}, revisor_nome = ${u.nome},
          concluido_em = now(), snapshot = ${JSON.stringify(snapshot)}::jsonb, atualizado_em = now()
        WHERE id = ${a.id} AND status = 'Em revisão' RETURNING id
      `;
    }
    if (!linhas.length) return NextResponse.json({ error: "O assessment mudou enquanto você agia. Recarregue a página." }, { status: 409 });
    return NextResponse.json({ ok: true, status: d.para });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao mudar o status do assessment." }, { status: 500 });
  }
}
