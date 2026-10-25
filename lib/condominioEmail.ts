// E-mail de aviso de prazo do conselheiro-admin — reaproveita o Resend já
// usado em Gestão de Riscos (app/api/cadastro-risco/route.ts). Se a chave
// não estiver configurada, falha em silêncio: o aviso em tela continua
// funcionando mesmo sem e-mail.
export async function enviarAvisoPrazoConselheiroAdmin(
  email: string,
  nome: string,
  diasUteisRestantes: number,
  prazoAte: Date
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !email) return;

  const prazoFormatado = prazoAte.toLocaleDateString("pt-BR");
  const plural = diasUteisRestantes === 1 ? "dia útil" : "dias úteis";

  const html = `
    <div style="background:#fafaf9;padding:24px;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:560px;margin:0 auto;border:1px solid #e4e2dd;border-radius:6px;overflow:hidden;">
        <div style="background:#2b3a4a;color:#ffffff;padding:18px 24px;">
          <div style="font-weight:700;font-size:16px;">Gestão de Condomínio</div>
        </div>
        <div style="background:#ffffff;padding:24px;">
          <h2 style="font-size:17px;margin:0 0 12px;color:#1a1a18;">Seu prazo de conselheiro-admin está acabando</h2>
          <p style="font-size:14px;line-height:1.6;color:#1a1a18;margin:0 0 12px;">
            Olá, ${nome}. Faltam <strong>${diasUteisRestantes} ${plural}</strong> para o seu prazo
            de conselheiro-admin vencer (${prazoFormatado}).
          </p>
          <p style="font-size:14px;line-height:1.6;color:#1a1a18;margin:0;">
            Se ainda não cadastrou o novo síndico, você mesmo pode renovar o
            prazo em Manutenção de Condôminos, ou pedir para o síndico atual
            renovar por você.
          </p>
        </div>
        <div style="background:#fafaf9;padding:14px 24px;font-size:11px;color:#6b6b66;border-top:1px solid #e4e2dd;">
          Este é um e-mail automático do sistema de Gestão de Condomínio — não responda a esta mensagem.
        </div>
      </div>
    </div>
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Gestão de Condomínio <condominio@rodrigotavares.com.br>",
      to: [email],
      subject: `Seu prazo de conselheiro-admin vence em ${diasUteisRestantes} ${plural}`,
      html,
    }),
  });
}

// E-mail ao condômino que abriu o chamado, avisando que o status mudou —
// mesma regra de falha silenciosa se RESEND_API_KEY não estiver configurada.
export async function enviarAvisoMudancaStatusChamado(
  email: string,
  nome: string,
  chamadoId: number,
  titulo: string,
  statusNovo: string,
  justificativa: string | null
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !email) return;

  const primeiroNome = nome.split(" ")[0] || nome;
  const urlChamado = `https://lab.rodrigotavares.com.br/condominio/chamados/${chamadoId}`;

  const html = `
    <div style="background:#fafaf9;padding:24px;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:560px;margin:0 auto;border:1px solid #e4e2dd;border-radius:6px;overflow:hidden;">
        <div style="background:#2b3a4a;color:#ffffff;padding:18px 24px;">
          <div style="font-weight:700;font-size:16px;">Gestão de Condomínio</div>
        </div>
        <div style="background:#ffffff;padding:24px;">
          <h2 style="font-size:17px;margin:0 0 12px;color:#1a1a18;">Seu chamado foi atualizado</h2>
          <p style="font-size:14px;line-height:1.6;color:#1a1a18;margin:0 0 12px;">
            Olá, ${primeiroNome}. O chamado <strong>#${chamadoId} — ${titulo}</strong> agora está
            com o status <strong>${statusNovo}</strong>.
          </p>
          ${justificativa ? `
          <p style="font-size:14px;line-height:1.6;color:#1a1a18;margin:0 0 12px;">
            <em>"${justificativa}"</em>
          </p>` : ""}
          <p style="font-size:14px;line-height:1.6;margin:0;">
            <a href="${urlChamado}" style="color:#2b3a4a;">Ver o chamado completo</a>
          </p>
        </div>
        <div style="background:#fafaf9;padding:14px 24px;font-size:11px;color:#6b6b66;border-top:1px solid #e4e2dd;">
          Este é um e-mail automático do sistema de Gestão de Condomínio — não responda a esta mensagem.
        </div>
      </div>
    </div>
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Gestão de Condomínio <condominio@rodrigotavares.com.br>",
      to: [email],
      subject: `Chamado #${chamadoId} atualizado: ${statusNovo}`,
      html,
    }),
  });
}
