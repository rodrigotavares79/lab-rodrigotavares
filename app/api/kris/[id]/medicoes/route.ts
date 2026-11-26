import { NextRequest, NextResponse } from "next/server";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { dataReferencia, numero } from "@/lib/kriRisco";
import { hojeSaoPaulo } from "@/lib/revisaoRisco";
import { registrarMedicao } from "@/lib/kriServidor";

export const dynamic = "force-dynamic";

// B21 · POST { referencia, valor, observacao? }: grava a medição manual
// (corrige se já houver uma na mesma data). Vermelho antecipa a revisão.
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  const { id } = await props.params;
  try {
    if (!/^\d+$/.test(id ?? "")) return NextResponse.json({ error: "KRI inválido." }, { status: 400 });
    const d = await request.json().catch(() => ({}));
    const referencia = dataReferencia(String(d?.referencia ?? ""));
    if (!referencia) return NextResponse.json({ error: "Data de referência inválida." }, { status: 400 });
    if (referencia > hojeSaoPaulo()) return NextResponse.json({ error: "A data de referência não pode ser futura." }, { status: 400 });
    const valor = numero(d?.valor);
    if (valor === null) return NextResponse.json({ error: "Informe o valor medido." }, { status: 400 });
    const observacao = typeof d?.observacao === "string" && d.observacao.trim() ? d.observacao.trim().slice(0, 1000) : null;
    const sql = sqlAuditado(guarda.usuario);
    const [kri] = await sql`SELECT * FROM kris WHERE id = ${id}`;
    if (!kri) return NextResponse.json({ error: "KRI não encontrado." }, { status: 404 });
    if (!kri.ativo) return NextResponse.json({ error: "KRI inativo não recebe medições." }, { status: 409 });
    const r = await registrarMedicao(sql, kri, { referencia, valor, observacao, origem: "manual" }, guarda.usuario);
    return NextResponse.json(r);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao gravar a medição." }, { status: 500 });
  }
}
