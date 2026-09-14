import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { classificarImpacto } from "@/lib/riscoUtils";

const STATUS_VALIDOS = ["Identificado", "Em Tratamento", "Resolvido"];

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id || !/^\d+$/.test(id)) {
      return NextResponse.json({ error: "ID de risco inválido." }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    const rows = await sql`
      SELECT
        r.id, r.projeto_id, p.nome AS projeto,
        r.categoria, r.gatilho, r.resultado_potencial, r.levantado_por,
        r.data_levantamento, r.fonte, r.impacto, r.probabilidade,
        r.matrix_score, r.nivel_inicial, r.impacto_qualitativo, r.status,
        r.sistema_critico_id, s.nome AS sistema_critico,
        r.duracao_horas, r.percentual_degradacao, r.restauracao_pessoas, r.restauracao_horas,
        r.impacto_critico_indisponibilidade, r.impacto_critico_restauracao, r.impacto_critico_total,
        r.impacto_alto_indisponibilidade, r.impacto_alto_restauracao, r.impacto_alto_total,
        r.criado_em
      FROM riscos r
      JOIN projetos p ON p.id = r.projeto_id
      LEFT JOIN sistemas_criticos s ON s.id = r.sistema_critico_id
      WHERE r.id = ${id}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Risco não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ risco: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar o risco." }, { status: 500 });
  }
}

// Reavaliação do risco após medidas de mitigação: recalcula o NÍVEL ATUAL
// (impacto_qualitativo) a partir de novo impacto/probabilidade e/ou atualiza o
// status. O nível inicial (nivel_inicial), gravado na criação, nunca é alterado
// aqui — ele é o "antes da mitigação" e serve de referência histórica.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id || !/^\d+$/.test(id)) {
      return NextResponse.json({ error: "ID de risco inválido." }, { status: 400 });
    }

    const body = await request.json();
    const { impacto, probabilidade, status } = body ?? {};

    if (status !== undefined && !STATUS_VALIDOS.includes(status)) {
      return NextResponse.json(
        { error: `Status inválido. Use um de: ${STATUS_VALIDOS.join(", ")}.` },
        { status: 400 }
      );
    }

    let impactoNum: number | null = null;
    let probabilidadeNum: number | null = null;
    if (impacto !== undefined) {
      impactoNum = Number(impacto);
      if (!Number.isFinite(impactoNum) || impactoNum < 1 || impactoNum > 5) {
        return NextResponse.json({ error: "Impacto deve ser um número de 1 a 5." }, { status: 400 });
      }
    }
    if (probabilidade !== undefined) {
      probabilidadeNum = Number(probabilidade);
      if (!Number.isFinite(probabilidadeNum) || probabilidadeNum < 1 || probabilidadeNum > 5) {
        return NextResponse.json({ error: "Probabilidade deve ser um número de 1 a 5." }, { status: 400 });
      }
    }

    const sql = neon(process.env.DATABASE_URL!);

    const atualRows = await sql`SELECT impacto, probabilidade, status FROM riscos WHERE id = ${id}`;
    if (atualRows.length === 0) {
      return NextResponse.json({ error: "Risco não encontrado." }, { status: 404 });
    }
    const atual = atualRows[0];

    const novoImpacto = impactoNum ?? atual.impacto;
    const novaProbabilidade = probabilidadeNum ?? atual.probabilidade;
    const novoStatus = status ?? atual.status;

    let novoMatrixScore: number | null = null;
    let novoNivelAtual: string | null = null;
    if (novoImpacto && novaProbabilidade) {
      novoMatrixScore = novoImpacto * novaProbabilidade;
      novoNivelAtual = classificarImpacto(novoMatrixScore);
    }

    const rows = await sql`
      UPDATE riscos
      SET impacto = ${novoImpacto},
          probabilidade = ${novaProbabilidade},
          matrix_score = ${novoMatrixScore},
          impacto_qualitativo = ${novoNivelAtual},
          status = ${novoStatus}
      WHERE id = ${id}
      RETURNING id, impacto, probabilidade, matrix_score, impacto_qualitativo, nivel_inicial, status
    `;

    return NextResponse.json({ risco: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno ao atualizar o risco." }, { status: 500 });
  }
}
