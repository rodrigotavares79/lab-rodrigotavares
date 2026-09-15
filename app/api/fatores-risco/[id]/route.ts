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

async function carregarFatorComRisco(sql: any, id: string) {
  const rows = await sql`
    SELECT fr.*, r.status AS risco_status
    FROM fatores_risco fr
    JOIN riscos r ON r.id = fr.risco_id
    WHERE fr.id = ${id}
  `;
  return rows[0] ?? null;
}

// PATCH: atualiza qualquer campo do fator/controle. Bloqueado por completo se
// o risco dono do fator já estiver Mitigado.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id || !/^\d+$/.test(id)) {
      return NextResponse.json({ error: "ID de fator de risco inválido." }, { status: 400 });
    }

    const body = await request.json();
    const sql = neon(process.env.DATABASE_URL!);

    const atual = await carregarFatorComRisco(sql, id);
    if (!atual) return NextResponse.json({ error: "Fator de risco não encontrado." }, { status: 404 });
    if (atual.risco_status === "Mitigado") {
      return NextResponse.json(
        { error: "O risco deste fator já foi mitigado. Nada pode mais ser alterado." },
        { status: 409 }
      );
    }

    if (body.natureza !== undefined && !OPCOES_NATUREZA_FATOR.includes(body.natureza)) {
      return NextResponse.json({ error: "Natureza inválida." }, { status: 400 });
    }
    if (body.criticidade !== undefined && !OPCOES_CRITICIDADE.includes(body.criticidade)) {
      return NextResponse.json({ error: "Criticidade inválida." }, { status: 400 });
    }
    if (body.tipoControle !== undefined && !OPCOES_TIPO_CONTROLE.includes(body.tipoControle)) {
      return NextResponse.json({ error: "Tipo de controle inválido." }, { status: 400 });
    }
    if (body.naturezaControle !== undefined && !OPCOES_NATUREZA_CONTROLE.includes(body.naturezaControle)) {
      return NextResponse.json({ error: "Natureza do controle inválida." }, { status: 400 });
    }
    if (body.eficaciaPotencial !== undefined && !OPCOES_EFICACIA_POTENCIAL.includes(body.eficaciaPotencial)) {
      return NextResponse.json({ error: "Eficácia potencial inválida." }, { status: 400 });
    }
    if (body.statusImplementacao !== undefined && !OPCOES_STATUS_IMPLEMENTACAO.includes(body.statusImplementacao)) {
      return NextResponse.json({ error: "Status de implementação inválido." }, { status: 400 });
    }
    if (body.vetorOverride !== undefined && body.vetorOverride !== null && !OPCOES_VETOR.includes(body.vetorOverride)) {
      return NextResponse.json({ error: "Vetor de override inválido." }, { status: 400 });
    }
    if (body.vetorOverride && !(body.justificativaOverride ?? atual.justificativa_override)?.trim()) {
      return NextResponse.json({ error: "Justificativa do override é obrigatória." }, { status: 400 });
    }

    const rows = await sql`
      UPDATE fatores_risco
      SET descricao = ${body.descricao ?? atual.descricao},
          explicacao = ${body.explicacao !== undefined ? body.explicacao : atual.explicacao},
          natureza = ${body.natureza ?? atual.natureza},
          criticidade = ${body.criticidade ?? atual.criticidade},
          controle_descricao = ${body.controleDescricao ?? atual.controle_descricao},
          tipo_controle = ${body.tipoControle ?? atual.tipo_controle},
          natureza_controle = ${body.naturezaControle ?? atual.natureza_controle},
          eficacia_potencial = ${body.eficaciaPotencial ?? atual.eficacia_potencial},
          status_implementacao = ${body.statusImplementacao ?? atual.status_implementacao},
          vetor_override = ${body.vetorOverride !== undefined ? body.vetorOverride : atual.vetor_override},
          justificativa_override = ${body.justificativaOverride !== undefined ? body.justificativaOverride : atual.justificativa_override}
      WHERE id = ${id}
      RETURNING id, risco_id, codigo, descricao, explicacao, natureza, criticidade,
                controle_descricao, tipo_controle, natureza_controle, eficacia_potencial,
                status_implementacao, vetor_override, justificativa_override, criado_em
    `;

    await recomputeRisco(sql, atual.risco_id);

    return NextResponse.json({ fator: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno ao atualizar o fator de risco." }, { status: 500 });
  }
}

// DELETE: remove um fator (ex.: cadastrado por engano). Bloqueado se o risco
// já estiver Mitigado.
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id || !/^\d+$/.test(id)) {
      return NextResponse.json({ error: "ID de fator de risco inválido." }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const atual = await carregarFatorComRisco(sql, id);
    if (!atual) return NextResponse.json({ error: "Fator de risco não encontrado." }, { status: 404 });
    if (atual.risco_status === "Mitigado") {
      return NextResponse.json(
        { error: "O risco deste fator já foi mitigado. Nada pode mais ser alterado." },
        { status: 409 }
      );
    }

    await sql`DELETE FROM fatores_risco WHERE id = ${id}`;
    await recomputeRisco(sql, atual.risco_id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno ao remover o fator de risco." }, { status: 500 });
  }
}
