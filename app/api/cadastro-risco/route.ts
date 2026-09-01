import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

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

    const sql = neon(process.env.DATABASE_URL!);

    // ---- Cálculo do impacto financeiro (feito no servidor, nunca confiando no cliente) ----
    let impactoCriticoIndisponibilidade = 0;
    let impactoCriticoRestauracao = 0;
    let impactoAltoIndisponibilidade = 0;
    let impactoAltoRestauracao = 0;
    let sistemaNome: string | null = null;

    if (sistemaCriticoId) {
      const sistemaRows = await sql`
        SELECT nome, custo_indisponibilidade_hora, custo_restauracao_hora_homem
        FROM sistemas_criticos WHERE id = ${sistemaCriticoId}
      `;
      const sistema = sistemaRows[0];
      if (sistema) {
        sistemaNome = sistema.nome;
        const custoIndisp = Number(sistema.custo_indisponibilidade_hora) || 0;
        const custoRestauracao = Number(sistema.custo_restauracao_hora_homem) || 0;
        const horas = Number(duracaoHoras) || 0;
        const pct = Number(percentualDegradacao) || 0;
        const pessoas = Number(restauracaoPessoas) || 0;
        const horasRestauracao = Number(restauracaoHoras) || 0;

        impactoCriticoIndisponibilidade = custoIndisp * horas;
        impactoCriticoRestauracao = custoRestauracao * pessoas * horasRestauracao;

        impactoAltoIndisponibilidade = custoIndisp * horas * (pct / 100);
        impactoAltoRestauracao = custoRestauracao * pessoas * horasRestauracao;
      }
    }

    const impactoCriticoTotal = impactoCriticoIndisponibilidade + impactoCriticoRestauracao;
    const impactoAltoTotal = impactoAltoIndisponibilidade + impactoAltoRestauracao;

    // ---- Gravação no banco ----
    const projetoRows = await sql`SELECT nome FROM projetos WHERE id = ${projetoId}`;
    const projetoNome = projetoRows[0]?.nome ?? "—";

    await sql`
      INSERT INTO riscos (
        projeto_id, categoria, gatilho, resultado_potencial, levantado_por,
        data_levantamento, fonte, impacto, probabilidade, matrix_score, impacto_qualitativo,
        sistema_critico_id, duracao_horas, percentual_degradacao, restauracao_pessoas, restauracao_horas,
        impacto_critico_indisponibilidade, impacto_critico_restauracao, impacto_critico_total,
        impacto_alto_indisponibilidade, impacto_alto_restauracao, impacto_alto_total
      ) VALUES (
        ${projetoId}, ${categoria || null}, ${gatilho || null}, ${resultado || null}, ${levantadoPor},
        ${dataLevantamento || null}, ${fonte || null}, ${impacto || null}, ${probabilidade || null},
        ${matrixScore || null}, ${classificacaoLabel || null},
        ${sistemaCriticoId || null}, ${duracaoHoras || null}, ${percentualDegradacao || null},
        ${restauracaoPessoas || null}, ${restauracaoHoras || null},
        ${impactoCriticoIndisponibilidade || null}, ${impactoCriticoRestauracao || null}, ${impactoCriticoTotal || null},
        ${impactoAltoIndisponibilidade || null}, ${impactoAltoRestauracao || null}, ${impactoAltoTotal || null}
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
      ["Impacto Qualitativo", classificacaoLabel || "—"],
    ];

    if (sistemaNome) {
      linhas.push(["Sistema Crítico", sistemaNome]);
      linhas.push([
        "Impacto Financeiro — Evento Crítico",
        `${formatBRL(impactoCriticoTotal)} (indisponibilidade: ${formatBRL(impactoCriticoIndisponibilidade)}; restauração: ${formatBRL(impactoCriticoRestauracao)})`,
      ]);
      linhas.push([
        "Impacto Financeiro — Alto Impacto",
        `${formatBRL(impactoAltoTotal)} (indisponibilidade: ${formatBRL(impactoAltoIndisponibilidade)}; restauração: ${formatBRL(impactoAltoRestauracao)})`,
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
        subject: "Confirmação de Cadastro de Risco",
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
      impactoCritico: { indisponibilidade: impactoCriticoIndisponibilidade, restauracao: impactoCriticoRestauracao, total: impactoCriticoTotal },
      impactoAlto: { indisponibilidade: impactoAltoIndisponibilidade, restauracao: impactoAltoRestauracao, total: impactoAltoTotal },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno ao processar o envio." }, { status: 500 });
  }
}
