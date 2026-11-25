import { NextRequest, NextResponse } from "next/server";
import { recomputeRisco } from "@/lib/recomputeRisco";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { exigirPermissao } from "@/lib/riscosAuth";
import { validarFator } from "@/lib/validarFator";

export const dynamic = "force-dynamic";


export async function POST(request: NextRequest) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  try {
    const body = await request.json();
    const erro = validarFator(body);
    if (erro) return NextResponse.json({ error: erro }, { status: 400 });

    const sql = sqlAuditado(guarda.usuario);

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

    // B15: com um controle cadastrado, a declaração "sem controles" deixa de valer.
    await sql`
      UPDATE riscos SET sem_controles = false, sem_controles_justificativa = NULL,
                        sem_controles_por_email = NULL, sem_controles_em = NULL
      WHERE id = ${body.riscoId} AND sem_controles
    `;
    await recomputeRisco(sql, body.riscoId);

    return NextResponse.json({ fator: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno ao cadastrar o fator de risco." }, { status: 500 });
  }
}
