import { NextRequest, NextResponse } from "next/server";

function escapeHtml(value: unknown): string {
  const str = String(value ?? "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const {
      categoria,
      gatilho,
      resultado,
      levantadoPor,
      dataLevantamento,
      fonte,
      impactoLabel,
      probabilidadeLabel,
      matrixScore,
      classificacaoLabel,
    } = data ?? {};

    if (!levantadoPor || typeof levantadoPor !== "string" || !levantadoPor.includes("@")) {
      return NextResponse.json({ error: "E-mail de 'Levantado Por' inválido." }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "RESEND_API_KEY não configurada." }, { status: 500 });
    }

    const linhas: [string, string][] = [
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

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno ao processar o envio." }, { status: 500 });
  }
}
