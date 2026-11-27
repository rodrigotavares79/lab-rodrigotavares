import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { AREAS_ASSESSMENT, podeEditar, validarNovoAssessment } from "@/lib/assessmentRegras";
import { carregarAssessment } from "@/lib/assessmentServidor";

export const dynamic = "force-dynamic";

function idValido(id: string | undefined) {
  return /^\d+$/.test(id ?? "") ? Number(id) : null;
}

// B28 · GET: o assessment, as perguntas das áreas escolhidas, respostas,
// riscos vinculados, pendências e maturidade, mais o que o usuário pode fazer.
export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  const id = idValido((await props.params).id);
  if (!id) return NextResponse.json({ error: "Assessment inválido." }, { status: 400 });
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const dados = await carregarAssessment(sql as any, id);
    if (!dados) return NextResponse.json({ error: "Assessment não encontrado." }, { status: 404 });
    const u = guarda.usuario;
    const a = dados.assessment;
    const ator = { email: u.email, editarRiscos: u.permissoes.editarRiscos, auditar: u.permissoes.auditar };
    const ehAnalista = a.analista_email.toLowerCase() === u.email.toLowerCase();
    const { snapshot, ...cabecalho } = a;
    return NextResponse.json({
      ...dados,
      assessment: cabecalho,
      temSnapshot: !!snapshot,
      areasDisponiveis: AREAS_ASSESSMENT,
      acoes: {
        editar: podeEditar(a.status, ator),
        enviarRevisao: a.status === "Rascunho" && ator.editarRiscos,
        revisar: a.status === "Em revisão" && ator.auditar && !ehAnalista,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar o assessment." }, { status: 500 });
  }
}

// B28 · PATCH: altera título, tipo, projeto, escopo, objetivo, data e áreas
// (só em Rascunho). Tirar uma área não apaga as respostas dela.
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  const id = idValido((await props.params).id);
  if (!id) return NextResponse.json({ error: "Assessment inválido." }, { status: 400 });
  try {
    const d = await request.json().catch(() => ({}));
    const invalido = validarNovoAssessment(d ?? {});
    if (invalido) return NextResponse.json({ error: invalido }, { status: 400 });
    const sql = sqlAuditado(guarda.usuario);
    const [a] = await sql`SELECT status, projeto_id FROM assessments WHERE id = ${id}`;
    if (!a) return NextResponse.json({ error: "Assessment não encontrado." }, { status: 404 });
    if (a.status !== "Rascunho") return NextResponse.json({ error: "Só é possível alterar um assessment em Rascunho." }, { status: 409 });
    const [projeto] = await sql`SELECT id FROM projetos WHERE id = ${Number(d.projetoId)} AND (ativo OR id = ${a.projeto_id})`;
    if (!projeto) return NextResponse.json({ error: "Projeto não encontrado ou inativo." }, { status: 404 });
    const areas = AREAS_ASSESSMENT.filter((x) => d.areas.includes(x));
    const dataInicio = typeof d.dataInicio === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.dataInicio) ? d.dataInicio : null;
    await sql`
      UPDATE assessments SET
        titulo = ${String(d.titulo).trim().slice(0, 200)}, tipo = ${d.tipo}, projeto_id = ${projeto.id},
        escopo = ${String(d.escopo).trim().slice(0, 2000)},
        objetivo = ${typeof d.objetivo === "string" && d.objetivo.trim() ? d.objetivo.trim().slice(0, 2000) : null},
        areas = ${areas}, data_inicio = ${dataInicio}, atualizado_em = now()
      WHERE id = ${id} AND status = 'Rascunho'
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao alterar o assessment." }, { status: 500 });
  }
}
