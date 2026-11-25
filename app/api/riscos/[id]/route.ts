import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { nivelRisco } from "@/lib/metodologiaRisco";
import { recomputeRisco } from "@/lib/recomputeRisco";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { exigirPermissao } from "@/lib/riscosAuth";
import { STATUS_RISCO, statusValido, validarTransicaoStatus, type StatusRisco } from "@/lib/statusRisco";
import { resumoPlanos } from "@/lib/sincronizarStatusRisco";
import { opcaoValida } from "@/lib/aceitacaoRisco";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  const params = await props.params;
  try {
    const { id } = params;
    if (!id || !/^\d+$/.test(id)) {
      return NextResponse.json({ error: "ID de risco inválido." }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });

    const rows = await sql`
      SELECT
        r.id, r.projeto_id, p.nome AS projeto,
        r.categoria, r.gatilho, r.resultado_potencial, r.levantado_por,
        r.data_levantamento, r.fonte, r.impacto, r.probabilidade,
        r.matrix_score, r.nivel_inicial, r.impacto_qualitativo, r.nivel_projetado,
        r.prob_nivel_atual, r.imp_nivel_atual, r.prob_nivel_projetado, r.imp_nivel_projetado,
        r.im_prob_atual, r.im_imp_atual, r.im_prob_projetado, r.im_imp_projetado,
        r.status, r.opcao_tratamento,
        r.sistema_critico_id, s.nome AS sistema_critico,
        r.duracao_horas, r.duracao_horas_min, r.duracao_horas_max,
        r.percentual_degradacao, r.percentual_degradacao_min, r.percentual_degradacao_max,
        r.restauracao_pessoas, r.restauracao_pessoas_min, r.restauracao_pessoas_max,
        r.restauracao_horas, r.restauracao_horas_min, r.restauracao_horas_max,
        r.impacto_critico_total, r.impacto_critico_p10, r.impacto_critico_p90,
        r.impacto_alto_total, r.impacto_alto_p10, r.impacto_alto_p90,
        r.criado_em,
        rv.revisado_em, rv.dias_revisao, to_char(rv.proxima_revisao, 'YYYY-MM-DD') AS proxima_revisao
      FROM riscos r
      JOIN projetos p ON p.id = r.projeto_id
      LEFT JOIN sistemas_criticos s ON s.id = r.sistema_critico_id
      LEFT JOIN riscos_revisao rv ON rv.risco_id = r.id
      WHERE r.id = ${id}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Risco não encontrado." }, { status: 404 });
    }

    const fatores = await sql`
      SELECT id, risco_id, codigo, descricao, explicacao, natureza, criticidade,
             controle_descricao, tipo_controle, natureza_controle, eficacia_potencial,
             status_implementacao, vetor_override, justificativa_override, criado_em
      FROM fatores_risco
      WHERE risco_id = ${id}
      ORDER BY criado_em ASC
    `;

    return NextResponse.json({ risco: { ...rows[0], fatores } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar o risco." }, { status: 500 });
  }
}

// PATCH: edita o status do risco (Identificado/Em Tratamento/Mitigado) e/ou a
// Probabilidade e o Impacto INERENTES (base, antes de qualquer mitigação).
// O Risco Atual e o Projetado nunca são digitados aqui — eles são sempre
// recalculados a partir dos Fatores de Risco cadastrados (ver recomputeRisco).
// Congelamento: uma vez Mitigado, nada mais pode ser alterado.
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  const params = await props.params;
  try {
    const { id } = params;
    if (!id || !/^\d+$/.test(id)) {
      return NextResponse.json({ error: "ID de risco inválido." }, { status: 400 });
    }

    const body = await request.json();
    const { impacto, probabilidade, status, opcaoTratamento } = body ?? {};
    if (opcaoTratamento !== undefined && opcaoTratamento !== null && !opcaoValida(opcaoTratamento)) {
      return NextResponse.json({ error: "Opção de tratamento inválida." }, { status: 400 });
    }

    if (status !== undefined && !statusValido(status)) {
      return NextResponse.json(
        { error: `Status inválido. Use um de: ${STATUS_RISCO.join(", ")}.` },
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

    const sql = sqlAuditado(guarda.usuario);

    const atualRows = await sql`SELECT impacto, probabilidade, status, opcao_tratamento FROM riscos WHERE id = ${id}`;
    if (atualRows.length === 0) {
      return NextResponse.json({ error: "Risco não encontrado." }, { status: 404 });
    }
    const atual = atualRows[0];

    // Regras de transição (lib/statusRisco): Mitigado é terminal; Em
    // Tratamento exige plano; Mitigado exige todos os planos Conforme; risco
    // com plano não volta para Identificado.
    let novoStatus: StatusRisco = status ?? atual.status ?? "Identificado";
    const planos = await resumoPlanos(sql, id);
    // B16: trocar a opção de tratamento de "Aceitar" para outra tira o risco
    // de Aceito (vai para Em Tratamento se tiver plano, senão Identificado).
    const novaOpcao = opcaoTratamento !== undefined ? opcaoTratamento : atual.opcao_tratamento;
    if (atual.status === "Aceito" && novoStatus === "Aceito" && novaOpcao !== "Aceitar") {
      novoStatus = planos.total > 0 ? "Em Tratamento" : "Identificado";
    }
    const erroTransicao = validarTransicaoStatus(atual.status, novoStatus, planos);
    if (erroTransicao) {
      return NextResponse.json({ error: erroTransicao }, { status: 409 });
    }

    const novoImpacto = impactoNum ?? atual.impacto;
    const novaProbabilidade = probabilidadeNum ?? atual.probabilidade;
    const novoMatrixScore = novoImpacto && novaProbabilidade ? novoImpacto * novaProbabilidade : null;
    const novoNivelInerente = novoImpacto && novaProbabilidade ? nivelRisco(novaProbabilidade, novoImpacto) : null;

    await sql`
      UPDATE riscos
      SET impacto = ${novoImpacto},
          probabilidade = ${novaProbabilidade},
          matrix_score = ${novoMatrixScore},
          nivel_inicial = ${novoNivelInerente},
          status = ${novoStatus},
          opcao_tratamento = ${novaOpcao ?? null},
          mitigado_em = ${novoStatus === "Mitigado" ? new Date().toISOString() : null},
          -- B17: salvar a reavaliação registra a revisão periódica do risco.
          revisado_em = now()
      WHERE id = ${id} AND status IS DISTINCT FROM 'Mitigado'
    `;

    // B16: sair de Aceito, ou deixar de escolher "Aceitar", revoga a
    // aceitação pendente ou vigente.
    if ((atual.status === "Aceito" && novoStatus !== "Aceito") || novaOpcao !== "Aceitar") {
      await sql`
        UPDATE aceitacoes_risco
        SET situacao = 'Revogada', revogado_em = now(), revogado_por_email = ${guarda.usuario.email}
        WHERE risco_id = ${id} AND situacao IN ('Pendente', 'Aprovada')
      `;
    }

    // O nível inerente pode ter mudado — recalcula Atual e Projetado a partir
    // dos fatores já cadastrados (se não houver nenhum, ambos ficam iguais ao
    // novo inerente, como esperado).
    await recomputeRisco(sql, id);

    const rows = await sql`
      SELECT id, impacto, probabilidade, matrix_score, nivel_inicial, impacto_qualitativo,
             nivel_projetado, status, opcao_tratamento
      FROM riscos WHERE id = ${id}
    `;

    return NextResponse.json({ risco: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno ao atualizar o risco." }, { status: 500 });
  }
}
