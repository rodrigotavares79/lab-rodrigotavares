import { NextRequest, NextResponse } from "next/server";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { validarResposta } from "@/lib/assessmentRegras";

export const dynamic = "force-dynamic";

// B28 · PUT: grava (ou limpa) a resposta de uma pergunta. Só em Rascunho.
// Corpo: { perguntaId, resposta, descritivo, evidencia, entrevistados }.
// Resposta toda vazia apaga a linha, para a pergunta voltar a pendente.
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  const { id } = await props.params;
  if (!/^\d+$/.test(id ?? "")) return NextResponse.json({ error: "Assessment inválido." }, { status: 400 });
  try {
    const d = await request.json().catch(() => ({}));
    const sql = sqlAuditado(guarda.usuario);
    const [a] = await sql`SELECT id, status, areas FROM assessments WHERE id = ${Number(id)}`;
    if (!a) return NextResponse.json({ error: "Assessment não encontrado." }, { status: 404 });
    if (a.status !== "Rascunho") return NextResponse.json({ error: "Este assessment não está em Rascunho e não aceita alterações." }, { status: 409 });
    const [p] = await sql`SELECT id, area, tipo FROM assessment_perguntas WHERE id = ${Number(d?.perguntaId)}`;
    if (!p || !a.areas.includes(p.area)) return NextResponse.json({ error: "Pergunta fora das áreas deste assessment." }, { status: 400 });

    const v = validarResposta(p.tipo, d ?? {});
    if (typeof v === "string") return NextResponse.json({ error: v }, { status: 400 });

    if (!v.resposta && !v.descritivo && !v.evidencia && !v.entrevistados) {
      await sql`DELETE FROM assessment_respostas WHERE assessment_id = ${a.id} AND pergunta_id = ${p.id}`;
      return NextResponse.json({ ok: true, removida: true });
    }
    const [salva] = await sql`
      INSERT INTO assessment_respostas (assessment_id, pergunta_id, resposta, descritivo, evidencia, entrevistados, respondido_por_email, respondido_por_nome)
      VALUES (${a.id}, ${p.id}, ${v.resposta}, ${v.descritivo}, ${v.evidencia}, ${v.entrevistados}, ${guarda.usuario.email}, ${guarda.usuario.nome})
      ON CONFLICT (assessment_id, pergunta_id) DO UPDATE SET
        resposta = EXCLUDED.resposta, descritivo = EXCLUDED.descritivo, evidencia = EXCLUDED.evidencia,
        entrevistados = EXCLUDED.entrevistados, respondido_por_email = EXCLUDED.respondido_por_email,
        respondido_por_nome = EXCLUDED.respondido_por_nome, atualizado_em = now()
      WHERE (assessment_respostas.resposta, assessment_respostas.descritivo, assessment_respostas.evidencia, assessment_respostas.entrevistados)
        IS DISTINCT FROM (EXCLUDED.resposta, EXCLUDED.descritivo, EXCLUDED.evidencia, EXCLUDED.entrevistados)
      RETURNING atualizado_em
    `;
    return NextResponse.json({ ok: true, atualizado_em: salva?.atualizado_em ?? null });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao gravar a resposta." }, { status: 500 });
  }
}
