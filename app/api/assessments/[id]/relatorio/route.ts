import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";
import { carregarAssessment } from "@/lib/assessmentServidor";

export const dynamic = "force-dynamic";

// B28 · GET: dados do relatório. Concluído: a foto gravada na conclusão
// (respostas, maturidade e riscos como estavam). Antes disso: prévia com os
// dados atuais, marcada como tal.
export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  const { id } = await props.params;
  if (!/^\d+$/.test(id ?? "")) return NextResponse.json({ error: "Assessment inválido." }, { status: 400 });
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const dados = await carregarAssessment(sql as any, Number(id));
    if (!dados) return NextResponse.json({ error: "Assessment não encontrado." }, { status: 404 });
    const { snapshot, ...assessment } = dados.assessment;
    if (assessment.status === "Concluído" && snapshot) {
      return NextResponse.json({
        assessment,
        previa: false,
        perguntas: snapshot.perguntas,
        respostas: snapshot.respostas,
        riscos: snapshot.riscos,
        maturidade: snapshot.maturidade,
        fotoEm: snapshot.gerado_em,
      });
    }
    return NextResponse.json({
      assessment,
      previa: true,
      perguntas: dados.perguntas,
      respostas: dados.respostas,
      riscos: dados.riscos,
      maturidade: dados.maturidade,
      fotoEm: null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao montar o relatório." }, { status: 500 });
  }
}
