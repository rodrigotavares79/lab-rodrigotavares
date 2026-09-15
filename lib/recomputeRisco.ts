import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import {
  OPCOES_NATUREZA_FATOR,
  OPCOES_CRITICIDADE,
  OPCOES_TIPO_CONTROLE,
  OPCOES_NATUREZA_CONTROLE,
  OPCOES_EFICACIA_POTENCIAL,
  OPCOES_STATUS_IMPLEMENTACAO,
  OPCOES_VETOR,
} from "@/lib/metodologiaRisco";
import { recomputeRisco } from "@/lib/recomputeRisco";

function validar(body: any): string | null {
  if (!body?.riscoId) return "riscoId é obrigatório.";
  if (!body?.descricao?.trim()) return "Descrição do fator é obrigatória.";
  if (!OPCOES_NATUREZA_FATOR.includes(body?.natureza)) return `Natureza inválida. Use um de: ${OPCOES_NATUREZA_FATOR.join(", ")}.`;
  if (!OPCOES_CRITICIDADE.includes(body?.criticidade)) return `Criticidade inválida. Use um de: ${OPCOES_CRITICIDADE.join(", ")}.`;
  if (!body?.controleDescricao?.trim()) return "Descrição do controle é obrigatória.";
  if (!OPCOES_TIPO_CONTROLE.includes(body?.tipoControle)) return `Tipo de controle inválido. Use um de: ${OPCOES_TIPO_CONTROLE.join(", ")}.`;
  if (!OPCOES_NATUREZA_CONTROLE.includes(body?.naturezaControle)) return `Natureza do controle inválida. Use um de: ${OPCOES_NATUREZA_CONTROLE.join(", ")}.`;
  if (!OPCOES_EFICACIA_POTENCIAL.includes(body?.eficaciaPotencial)) return `Eficácia potencial inválida. Use um de: ${OPCOES_EFICACIA_POTENCIAL.join(", ")}.`;
  if (body?.statusImplementacao && !OPCOES_STATUS_IMPLEMENTACAO.includes(body.statusImplementacao)) return `Status de implementação inválido.`;
  if (body?.vetorOverride && !OPCOES_VETOR.includes(body.vetorOverride)) return `Vetor de override inválido.`;
  if (body?.vetorOverride && !body?.justificativaOverride?.trim()) return "Justificativa do override é obrigatória quando o vetor sugerido é sobrescrito.";
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const erro = validar(body);
    if (erro) return NextResponse.json({ error: erro }, { status: 400 });

    const sql = neon(process.env.DATABASE_URL!);

    const riscoRows = await sql`SELECT id, status FROM riscos WHERE id = ${body.riscoId}`;
    if (riscoRows.length === 0) {
      return NextResponse.json({ error: "Risco não encontrado." }, { status: 404 });
    }
    if (riscoRows[0].status === "Mitigado") {
      return NextResponse.json(
        { error: "Este risco já foi mitigado. Não é possível cadastrar novo fator de risco." },
        { status: 409 }
      );
    }

    const totalRows = await sql`SELECT COUNT(*)::int AS total FROM fatores_risco WHERE risco_id = ${body.riscoId}`;
    const codigo = `F${String(totalRows[0].total + 1).padStart(2, "0")}`;

    const rows = await sql`
      INSERT INTO fatores_risco (
        risco_id, codigo, descricao, explicacao, natureza, criticidade,
        controle_descricao, tipo_controle, natureza_controle, eficacia_potencial,
        status_implementacao, vetor_override, justificativa_override
      ) VALUES (
        ${body.riscoId}, ${codigo}, ${body.descricao.trim()}, ${body.explicacao || null},
        ${body.natureza}, ${body.criticidade},
        ${body.controleDescricao.trim()}, ${body.tipoControle}, ${body.naturezaControle}, ${body.eficaciaPotencial},
        ${body.statusImplementacao || "Não iniciado"}, ${body.vetorOverride || null}, ${body.justificativaOverride || null}
      )
      RETURNING id, risco_id, codigo, descricao, explicacao, natureza, criticidade,
                controle_descricao, tipo_controle, natureza_controle, eficacia_potencial,
                status_implementacao, vetor_override, justificativa_override, criado_em
    `;

    await recomputeRisco(sql, body.riscoId);

    return NextResponse.json({ fator: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno ao cadastrar o fator de risco." }, { status: 500 });
  }
}
