import { NextRequest, NextResponse } from "next/server";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { LIMITE_FREQUENCIA, LIMITE_HORAS, calcularExposicao, lerFaixa, perdaPorIndisponibilidade, type Faixa } from "@/lib/exposicaoRisco";

export const dynamic = "force-dynamic";

// B23 · PUT { frequencia: {min, provavel, max}, perda?: {...}, usarAtivo?: true, horas?: {...}, premissas? }
// Grava a frequência anual e a perda por evento e recalcula a exposição.
// Com usarAtivo, a perda é o custo de indisponibilidade por hora do ativo
// crítico vinculado × horas de parada.
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  const { id } = await props.params;
  try {
    if (!/^\d+$/.test(id ?? "")) return NextResponse.json({ error: "ID de risco inválido." }, { status: 400 });
    const d = await request.json().catch(() => ({}));
    const sql = sqlAuditado(guarda.usuario);
    const [risco] = await sql`
      SELECT r.id, r.status, s.custo_indisponibilidade_hora
      FROM riscos r LEFT JOIN sistemas_criticos s ON s.id = r.sistema_critico_id
      WHERE r.id = ${id}
    `;
    if (!risco) return NextResponse.json({ error: "Risco não encontrado." }, { status: 404 });
    if (risco.status === "Mitigado") return NextResponse.json({ error: "Risco mitigado não pode ser alterado." }, { status: 409 });

    const freq = lerFaixa(d?.frequencia, "frequência anual", LIMITE_FREQUENCIA);
    if (typeof freq === "string") return NextResponse.json({ error: freq }, { status: 400 });
    let perda: Faixa | string | null;
    let horas: Faixa | null = null;
    let origem: "manual" | "ativo" = "manual";
    if (d?.usarAtivo) {
      const h = lerFaixa(d?.horas, "horas de parada", LIMITE_HORAS);
      if (typeof h === "string") return NextResponse.json({ error: h }, { status: 400 });
      horas = h;
      perda = perdaPorIndisponibilidade(risco.custo_indisponibilidade_hora, h);
      origem = "ativo";
      if (!perda) {
        return NextResponse.json(
          { error: "O ativo vinculado não tem custo de indisponibilidade por hora. Informe a perda por evento." },
          { status: 400 }
        );
      }
    } else {
      perda = lerFaixa(d?.perda, "perda por evento");
    }
    if (typeof perda === "string") return NextResponse.json({ error: perda }, { status: 400 });

    const e = calcularExposicao(freq, perda);
    const premissas = typeof d?.premissas === "string" && d.premissas.trim() ? d.premissas.trim().slice(0, 2000) : null;
    await sql`
      UPDATE riscos SET
        freq_anual_min = ${freq.min}, freq_anual_provavel = ${freq.provavel}, freq_anual_max = ${freq.max},
        perda_evento_min = ${perda.min}, perda_evento_provavel = ${perda.provavel}, perda_evento_max = ${perda.max},
        perda_origem = ${origem}, horas_parada_min = ${horas?.min ?? null}, horas_parada_provavel = ${horas?.provavel ?? null},
        horas_parada_max = ${horas?.max ?? null}, exposicao_ale = ${e.ale}, exposicao_min = ${e.min}, exposicao_max = ${e.max},
        exposicao_premissas = ${premissas}, exposicao_em = now()
      WHERE id = ${id}
    `;
    return NextResponse.json({ exposicao: e, perda, origem });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao gravar a estimativa." }, { status: 500 });
  }
}

// B23 · DELETE: remove a estimativa do risco.
export async function DELETE(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  const { id } = await props.params;
  try {
    if (!/^\d+$/.test(id ?? "")) return NextResponse.json({ error: "ID de risco inválido." }, { status: 400 });
    const sql = sqlAuditado(guarda.usuario);
    await sql`
      UPDATE riscos SET
        freq_anual_min = NULL, freq_anual_provavel = NULL, freq_anual_max = NULL,
        perda_evento_min = NULL, perda_evento_provavel = NULL, perda_evento_max = NULL,
        perda_origem = NULL, horas_parada_min = NULL, horas_parada_provavel = NULL, horas_parada_max = NULL, exposicao_ale = NULL, exposicao_min = NULL, exposicao_max = NULL,
        exposicao_premissas = NULL, exposicao_em = NULL
      WHERE id = ${id} AND status <> 'Mitigado'
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao remover a estimativa." }, { status: 500 });
  }
}
