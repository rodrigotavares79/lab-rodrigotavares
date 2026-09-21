import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { simularImpactoFinanceiro, type FaixaEstimativa } from "@/lib/riscoUtils";
import { nivelRisco } from "@/lib/metodologiaRisco";

export const dynamic = "force-dynamic";

// O cliente manda cada campo de impacto financeiro como faixa
// {min, provavel, max}. Aceita também number solto (compat com clientes
// antigos/scripts) tratando como faixa de largura zero.
function paraFaixaOuNull(v: unknown): FaixaEstimativa | null {
  if (v == null) return null;
  if (typeof v === "number") return { min: v, provavel: v, max: v };
  if (typeof v === "object" && "provavel" in (v as any)) {
    const f = v as FaixaEstimativa;
    return { min: Number(f.min) || 0, provavel: Number(f.provavel) || 0, max: Number(f.max) || 0 };
  }
  return null;
}

function escapeHtml(value: unknown): string {
  const str = String(value ?? "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Prefixo no assunto do e-mail fora de produção, pra quem testar em
// HMG/DEV não confundir com um cadastro real.
const ENV = process.env.NEXT_PUBLIC_ENV_NAME;
const prefixoAmbiente = ENV === "homolog" ? "[HMG] " : ENV === "dev" ? "[DEV] " : "";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const {
      projetoId,
      categoria,
      gatilho,
      resultado,
      levantadoPor,
      dataLevantamento,
      fonte,
      impacto,
      probabilidade,
      impactoLabel,
      probabilidadeLabel,
      matrixScore,
      classificacaoLabel,
      sistemaCriticoId,
      duracaoHoras,
      percentualDegradacao,
      restauracaoPessoas,
      restauracaoHoras,
    } = data ?? {};

    if (!levantadoPor || typeof levantadoPor !== "string" || !levantadoPor.includes("@")) {
      return NextResponse.json({ error: "E-mail de 'Levantado Por' inválido." }, { status: 400 });
    }
    if (!projetoId) {
      return NextResponse.json({ error: "Projeto é obrigatório." }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });

    // ---- Cálculo do impacto financeiro (feito no servidor, nunca confiando no cliente) ----
    let sistemaNome: string | null = null;
    type SistemaRow = { nome: string; custo_indisponibilidade_hora: number; custo_restauracao_hora_homem: number };
    let sistema: SistemaRow | null = null;

    if (sistemaCriticoId) {
      const sistemaRows = await sql`
        SELECT nome, custo_indisponibilidade_hora, custo_restauracao_hora_homem
        FROM sistemas_criticos WHERE id = ${sistemaCriticoId}
      `;
      sistema = (sistemaRows[0] as SistemaRow) ?? null;
      if (sistema) sistemaNome = sistema.nome;
    }

    const faixaDuracaoHoras = paraFaixaOuNull(duracaoHoras);
    const faixaPercentualDegradacao = paraFaixaOuNull(percentualDegradacao);
    const faixaRestauracaoPessoas = paraFaixaOuNull(restauracaoPessoas);
    const faixaRestauracaoHoras = paraFaixaOuNull(restauracaoHoras);

    const simulacao = sistema
      ? simularImpactoFinanceiro(sistema, {
          duracaoHoras: faixaDuracaoHoras,
          percentualDegradacao: faixaPercentualDegradacao,
          restauracaoPessoas: faixaRestauracaoPessoas,
          restauracaoHoras: faixaRestauracaoHoras,
        })
      : null;

    // Valor único gravado nas colunas "clássicas" (usadas por dashboard e
    // relatório em SUM()) passa a ser a mediana da simulação em vez do
    // cálculo pontual — com faixa degenerada (sem incerteza) dá exatamente
    // no mesmo número de antes.
    const impactoCriticoIndisponibilidade = simulacao?.critico.indisponibilidade.p50 ?? 0;
    const impactoCriticoRestauracao = simulacao?.critico.restauracao.p50 ?? 0;
    const impactoCriticoTotal = simulacao?.critico.total.p50 ?? 0;
    const impactoCriticoP10 = simulacao?.critico.total.p10 ?? null;
    const impactoCriticoP90 = simulacao?.critico.total.p90 ?? null;

    const impactoAltoIndisponibilidade = simulacao?.alto.indisponibilidade.p50 ?? 0;
    const impactoAltoRestauracao = simulacao?.alto.restauracao.p50 ?? 0;
    const impactoAltoTotal = simulacao?.alto.total.p50 ?? 0;
    const impactoAltoP10 = simulacao?.alto.total.p10 ?? null;
    const impactoAltoP90 = simulacao?.alto.total.p90 ?? null;

    // ---- Cálculo do nível de risco (sempre no servidor, nunca confiando no
    // valor calculado no navegador) ----
    const nivelInerente = impacto && probabilidade ? nivelRisco(probabilidade, impacto) : null;

    // ---- Gravação no banco ----
    const projetoRows = await sql`SELECT nome FROM projetos WHERE id = ${projetoId}`;
    const projetoNome = projetoRows[0]?.nome ?? "—";

    await sql`
      INSERT INTO riscos (
        projeto_id, categoria, gatilho, resultado_potencial, levantado_por,
        data_levantamento, fonte, impacto, probabilidade, matrix_score,
        nivel_inicial, impacto_qualitativo, nivel_projetado,
        prob_nivel_atual, imp_nivel_atual, prob_nivel_projetado, imp_nivel_projetado,
        sistema_critico_id,
        duracao_horas, duracao_horas_min, duracao_horas_max,
        percentual_degradacao, percentual_degradacao_min, percentual_degradacao_max,
        restauracao_pessoas, restauracao_pessoas_min, restauracao_pessoas_max,
        restauracao_horas, restauracao_horas_min, restauracao_horas_max,
        impacto_critico_indisponibilidade, impacto_critico_restauracao, impacto_critico_total,
        impacto_critico_p10, impacto_critico_p90,
        impacto_alto_indisponibilidade, impacto_alto_restauracao, impacto_alto_total,
        impacto_alto_p10, impacto_alto_p90
      ) VALUES (
        ${projetoId}, ${categoria || null}, ${gatilho || null}, ${resultado || null}, ${levantadoPor},
        ${dataLevantamento || null}, ${fonte || null}, ${impacto || null}, ${probabilidade || null},
        ${matrixScore || null}, ${nivelInerente}, ${nivelInerente}, ${nivelInerente},
        ${probabilidade || null}, ${impacto || null}, ${probabilidade || null}, ${impacto || null},
        ${sistemaCriticoId || null},
        ${faixaDuracaoHoras?.provavel ?? null}, ${faixaDuracaoHoras?.min ?? null}, ${faixaDuracaoHoras?.max ?? null},
        ${faixaPercentualDegradacao?.provavel ?? null}, ${faixaPercentualDegradacao?.min ?? null}, ${faixaPercentualDegradacao?.max ?? null},
        ${faixaRestauracaoPessoas?.provavel ?? null}, ${faixaRestauracaoPessoas?.min ?? null}, ${faixaRestauracaoPessoas?.max ?? null},
        ${faixaRestauracaoHoras?.provavel ?? null}, ${faixaRestauracaoHoras?.min ?? null}, ${faixaRestauracaoHoras?.max ?? null},
        ${impactoCriticoIndisponibilidade || null}, ${impactoCriticoRestauracao || null}, ${impactoCriticoTotal || null},
        ${impactoCriticoP10}, ${impactoCriticoP90},
        ${impactoAltoIndisponibilidade || null}, ${impactoAltoRestauracao || null}, ${impactoAltoTotal || null},
        ${impactoAltoP10}, ${impactoAltoP90}
      )
    `;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "RESEND_API_KEY não configurada." }, { status: 500 });
    }

    const linhas: [string, string][] = [
      ["Projeto", projetoNome],
      ["Categoria do Risco", categoria || "—"],
      ["Ponto de Gatilho", gatilho || "—"],
      ["Resultado Potencial", resultado || "—"],
      ["Levantado Por", levantadoPor],
      ["Data de Levantamento", dataLevantamento || "—"],
      ["Fonte", fonte || "—"],
      ["Impacto", impactoLabel || "—"],
      ["Probabilidade", probabilidadeLabel || "—"],
      ["Pontuação da Matriz", matrixScore ? String(matrixScore) : "—"],
      ["Impacto Qualitativo", nivelInerente || "—"],
    ];

    if (sistemaNome) {
      linhas.push(["Sistema Crítico", sistemaNome]);

      const faixaTexto = (p10: number | null, total: number, p90: number | null) =>
        p10 != null && p90 != null
          ? `${formatBRL(total)} — mais provável (faixa: ${formatBRL(p10)} a ${formatBRL(p90)})`
          : formatBRL(total);

      linhas.push([
        "Impacto Financeiro — Evento Crítico",
        `${faixaTexto(impactoCriticoP10, impactoCriticoTotal, impactoCriticoP90)} (indisponibilidade: ${formatBRL(impactoCriticoIndisponibilidade)}; restauração: ${formatBRL(impactoCriticoRestauracao)})`,
      ]);
      linhas.push([
        "Impacto Financeiro — Alto Impacto",
        `${faixaTexto(impactoAltoP10, impactoAltoTotal, impactoAltoP90)} (indisponibilidade: ${formatBRL(impactoAltoIndisponibilidade)}; restauração: ${formatBRL(impactoAltoRestauracao)})`,
      ]);
    }

    const linhasHtml = linhas
      .map(
        ([k, v]) => `
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #e4e2dd;color:#6b6b66;width:40%;font-size:13px;">${escapeHtml(k)}</td>
            <td style="padding:8px 0;border-bottom:1px solid #e4e2dd;color:#1a1a18;font-size:13px;font-weight:500;">${escapeHtml(v)}</td>
          </tr>`
      )
      .join("");

    const html = `
      <div style="background:#fafaf9;padding:24px;font-family:Arial,Helvetica,sans-serif;">
        <div style="max-width:560px;margin:0 auto;border:1px solid #e4e2dd;border-radius:6px;overflow:hidden;">
          <div style="background:#2b3a4a;color:#ffffff;padding:18px 24px;">
            <div style="font-weight:700;font-size:16px;">MONSTROS S.A.</div>
            <div style="font-size:12px;opacity:0.85;margin-top:2px;">Gestão de Riscos de TI</div>
          </div>
          <div style="background:#ffffff;padding:24px;">
            <h2 style="font-size:17px;margin:0 0 12px;color:#1a1a18;">Risco cadastrado com sucesso</h2>
            <p style="font-size:14px;line-height:1.6;color:#1a1a18;margin:0 0 18px;">
              Confirmamos o cadastro de um novo risco de TI com os dados abaixo.
              Guarde este e-mail como comprovante do registro.
            </p>
            <table style="width:100%;border-collapse:collapse;">
              ${linhasHtml}
            </table>
          </div>
          <div style="background:#fafaf9;padding:14px 24px;font-size:11px;color:#6b6b66;border-top:1px solid #e4e2dd;">
            Este é um e-mail automático do sistema de Gestão de Riscos da Monstros S.A. — não responda a esta mensagem.
          </div>
        </div>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Gestão de Riscos <riscos@rodrigotavares.com.br>",
        to: [levantadoPor],
        subject: `${prefixoAmbiente}Confirmação de Cadastro de Risco`,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const errText = await resendResponse.text();
      console.error("Resend error:", errText);
      return NextResponse.json({ error: "Falha ao enviar o e-mail." }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      impactoCritico: {
        indisponibilidade: impactoCriticoIndisponibilidade,
        restauracao: impactoCriticoRestauracao,
        total: impactoCriticoTotal,
        p10: impactoCriticoP10,
        p90: impactoCriticoP90,
      },
      impactoAlto: {
        indisponibilidade: impactoAltoIndisponibilidade,
        restauracao: impactoAltoRestauracao,
        total: impactoAltoTotal,
        p10: impactoAltoP10,
        p90: impactoAltoP90,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno ao processar o envio." }, { status: 500 });
  }
}
