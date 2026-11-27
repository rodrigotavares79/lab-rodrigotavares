import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sugerirRisco } from "@/lib/assessmentRegras";
import { origemRiscoAssessment } from "@/lib/assessmentServidor";

export const dynamic = "force-dynamic";

// B28 · GET ?pergunta=ID: dados para pré-preencher o cadastro de risco a
// partir de uma resposta Não ou Parcial (projeto, categoria, causa e ponto
// de gatilho). A gravação do vínculo é feita pelo próprio cadastro.
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  const { id } = await props.params;
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const r = await origemRiscoAssessment(sql as any, id, request.nextUrl.searchParams.get("pergunta"));
    if ("erro" in r) return NextResponse.json({ error: r.erro }, { status: 409 });
    const o = r.origem;
    const sugestao = sugerirRisco(
      { id: o.pergunta_id, codigo: o.codigo, area: o.area, texto: o.texto, tipo: o.tipo },
      { pergunta_id: o.pergunta_id, resposta: o.resposta, descritivo: o.descritivo },
      o.assessment_codigo
    );
    return NextResponse.json({
      origem: {
        assessmentId: o.assessment_id,
        assessmentCodigo: o.assessment_codigo,
        perguntaId: o.pergunta_id,
        perguntaCodigo: o.codigo,
        perguntaTexto: o.texto,
        area: o.area,
        resposta: o.resposta,
        evidencia: o.evidencia,
      },
      projetoId: o.projeto_id,
      sugestao,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao montar a sugestão de risco." }, { status: 500 });
  }
}
