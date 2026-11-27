import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { AREAS_ASSESSMENT, proximoCodigo, validarNovoAssessment } from "@/lib/assessmentRegras";

export const dynamic = "force-dynamic";

// B28 · GET: assessments com progresso (respondidas / total) e riscos gerados.
export async function GET() {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const assessments = await sql`
      SELECT a.id, a.codigo, a.titulo, a.tipo, a.status, a.areas, a.analista_nome, a.analista_email,
             a.revisor_nome, a.devolvido_motivo, p.nome AS projeto,
             to_char(a.data_inicio, 'YYYY-MM-DD') AS data_inicio, a.concluido_em,
             GREATEST(a.atualizado_em, (SELECT MAX(r.atualizado_em) FROM assessment_respostas r WHERE r.assessment_id = a.id)) AS ultima_atividade,
             (SELECT COUNT(*) FROM assessment_perguntas q
               WHERE q.ativa AND q.area = ANY(a.areas))::int AS perguntas,
             (SELECT COUNT(*) FROM assessment_respostas r JOIN assessment_perguntas q ON q.id = r.pergunta_id
               WHERE r.assessment_id = a.id AND q.area = ANY(a.areas)
                 AND ((q.tipo = 'objetiva' AND r.resposta IS NOT NULL)
                   OR (q.tipo = 'descritiva' AND btrim(coalesce(r.descritivo, '')) <> '')))::int AS respondidas,
             (SELECT COUNT(*) FROM assessment_riscos ar WHERE ar.assessment_id = a.id)::int AS riscos,
             (a.snapshot -> 'maturidade' ->> 'geral')::numeric AS maturidade_final
      FROM assessments a JOIN projetos p ON p.id = a.projeto_id
      ORDER BY (a.status = 'Concluído'), ultima_atividade DESC
    `;
    return NextResponse.json({ assessments, areas: AREAS_ASSESSMENT, podeCriar: guarda.usuario.permissoes.editarRiscos });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar os assessments." }, { status: 500 });
  }
}

// B28 · POST: cria um assessment em Rascunho, conduzido por quem cria.
export async function POST(request: NextRequest) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  try {
    const d = await request.json().catch(() => ({}));
    const invalido = validarNovoAssessment(d ?? {});
    if (invalido) return NextResponse.json({ error: invalido }, { status: 400 });
    const dataInicio = typeof d.dataInicio === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.dataInicio) ? d.dataInicio : null;
    const sql = sqlAuditado(guarda.usuario);
    const [projeto] = await sql`SELECT id FROM projetos WHERE id = ${Number(d.projetoId)}`;
    if (!projeto) return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });
    const codigos = await sql`SELECT codigo FROM assessments`;
    const codigo = proximoCodigo(codigos.map((c: any) => c.codigo));
    const areas = AREAS_ASSESSMENT.filter((a) => d.areas.includes(a));
    const [criado] = await sql`
      INSERT INTO assessments (codigo, titulo, tipo, projeto_id, escopo, objetivo, areas, data_inicio, analista_email, analista_nome)
      VALUES (${codigo}, ${String(d.titulo).trim().slice(0, 200)}, ${d.tipo}, ${projeto.id},
              ${String(d.escopo).trim().slice(0, 2000)}, ${typeof d.objetivo === "string" && d.objetivo.trim() ? d.objetivo.trim().slice(0, 2000) : null},
              ${areas}, ${dataInicio}, ${guarda.usuario.email}, ${guarda.usuario.nome})
      RETURNING id, codigo
    `;
    return NextResponse.json({ assessment: criado }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao criar o assessment." }, { status: 500 });
  }
}
