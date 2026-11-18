import { neon } from "@neondatabase/serverless";
import { clerkClient } from "@clerk/nextjs/server";
import { parsePerfilCondominio, type PerfilCondominio } from "@/lib/condominioAuth";
import { enviarEmail, escaparHtml, layoutEmail, URL_LAB } from "@/lib/condominioEmail";

// Alerta automático de estouro de SLA.
//
// Quando um chamado em aberto passa do prazo de atendimento, todos os
// conselheiros recebem um e-mail (um único e-mail por verificação, listando
// os chamados que acabaram de vencer) e o chamado ganha uma nota interna
// registrando o alerta — visível só para síndico e conselheiros. Pelo link
// do e-mail, o conselheiro abre o chamado e escreve uma nota interna para o
// síndico, que é avisado por e-mail (ver avisarSindicoSobreNotaDoConselho).
//
// A verificação é disparada por três fontes (uso do sistema, agendamento do
// GitHub a cada 15 min e tarefa diária da Vercel) e é idempotente: cada
// estouro de prazo gera um único alerta, por causa de
// chamados.sla_alerta_prazo. A tabela condominio_tarefas evita que ela rode
// mais de uma vez dentro do intervalo mínimo.

const STATUS_ENCERRADOS = ["Resolvido", "Cancelado"];

type ResultadoVerificacao = {
  executado: boolean;
  chamadosAlertados: number;
  conselheirosAvisados: number;
  emailEnviado: boolean;
};

function formatarDataHora(d: Date | string): string {
  return new Date(d).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
}

async function usuariosPorPerfil(perfis: PerfilCondominio[]): Promise<{ email: string; nome: string }[]> {
  const client = await clerkClient();
  const { data } = await client.users.getUserList({ limit: 200 });
  return data
    .filter((u) => perfis.includes(parsePerfilCondominio((u.publicMetadata ?? {}) as Record<string, unknown>)))
    .map((u) => {
      const email =
        u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ?? u.emailAddresses[0]?.emailAddress ?? "";
      return { email, nome: u.fullName || email };
    })
    .filter((u) => !!u.email);
}

export async function verificarAlertasSla(opcoes: { intervaloMinimoMinutos?: number } = {}): Promise<ResultadoVerificacao> {
  const intervalo = opcoes.intervaloMinimoMinutos ?? 10;
  const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });

  // Reserva a execução: só uma verificação por intervalo, mesmo com várias
  // fontes disparando ao mesmo tempo.
  const reserva = await sql`
    UPDATE condominio_tarefas
    SET ultima_execucao = now()
    WHERE nome = 'alerta_sla' AND ultima_execucao < now() - make_interval(mins => ${intervalo})
    RETURNING nome
  `;
  if (reserva.length === 0) {
    return { executado: false, chamadosAlertados: 0, conselheirosAvisados: 0, emailEnviado: false };
  }

  // Marca de uma vez (instrução atômica) os chamados que acabaram de vencer;
  // só quem marcou envia o alerta, então não há alerta duplicado.
  const vencidos = await sql`
    UPDATE chamados c
    SET sla_alerta_prazo = c.prazo_sla, sla_alerta_em = now()
    WHERE c.status <> ALL(${STATUS_ENCERRADOS}::text[])
      AND c.prazo_sla < now()
      AND c.sla_alerta_prazo IS DISTINCT FROM c.prazo_sla
    RETURNING c.id, c.titulo, c.urgencia, c.status, c.prazo_sla
  `;
  if (vencidos.length === 0) {
    return { executado: true, chamadosAlertados: 0, conselheirosAvisados: 0, emailEnviado: false };
  }

  const conselheiros = await usuariosPorPerfil(["conselheiro"]);

  // Nota interna em cada chamado — fica registrada no próprio chamado.
  for (const c of vencidos) {
    const texto =
      `⚠ Prazo de atendimento vencido em ${formatarDataHora(c.prazo_sla)} (status: ${c.status}). ` +
      (conselheiros.length > 0
        ? `${conselheiros.length} conselheiro(s) avisado(s) por e-mail.`
        : "Nenhum conselheiro cadastrado para receber o aviso.");
    await sql`
      INSERT INTO mensagens (chamado_id, autor_email, autor_nome, texto, visivel_condomino)
      VALUES (${c.id}, NULL, 'Sistema — alerta de prazo', ${texto}, false)
    `;
  }

  let emailEnviado = false;
  if (conselheiros.length > 0) {
    const limite = 20;
    const itens = vencidos
      .slice(0, limite)
      .map(
        (c) => `
        <li style="margin:0 0 8px;">
          <a href="${URL_LAB}/condominio/chamados/${c.id}" style="color:#2b3a4a;font-weight:700;">#${c.id} — ${escaparHtml(c.titulo)}</a><br/>
          <span style="color:#6b6b66;font-size:13px;">${escaparHtml(c.urgencia ?? "Sem urgência")} · ${escaparHtml(c.status)} · venceu em ${formatarDataHora(c.prazo_sla)}</span>
        </li>`
      )
      .join("");
    const resto = vencidos.length > limite ? `<p style="font-size:13px;color:#6b6b66;">E mais ${vencidos.length - limite} chamado(s).</p>` : "";
    const plural = vencidos.length === 1 ? "chamado passou" : "chamados passaram";
    const html = layoutEmail(
      `${vencidos.length} ${plural} do prazo de atendimento`,
      `
        <p style="font-size:14px;line-height:1.6;color:#1a1a18;margin:0 0 12px;">
          Os chamados abaixo estouraram o prazo (SLA) e ainda estão em aberto:
        </p>
        <ul style="padding-left:18px;font-size:14px;line-height:1.5;margin:0 0 12px;">${itens}</ul>
        ${resto}
        <p style="font-size:14px;line-height:1.6;color:#1a1a18;margin:0;">
          Para cobrar o síndico, abra o chamado e escreva uma mensagem marcando
          <strong>“Nota interna”</strong>. O síndico recebe a sua mensagem por e-mail,
          e ela fica registrada no chamado, visível só para síndico e conselheiros.
        </p>
      `
    );
    const assunto =
      vencidos.length === 1
        ? `Prazo vencido: chamado #${vencidos[0].id} — ${vencidos[0].titulo}`
        : `Prazo vencido em ${vencidos.length} chamados do condomínio`;
    try {
      emailEnviado = await enviarEmail(conselheiros.map((x) => x.email), assunto, html);
    } catch (err) {
      console.error("Falha ao enviar alerta de SLA aos conselheiros:", err);
    }
  }

  return {
    executado: true,
    chamadosAlertados: vencidos.length,
    conselheirosAvisados: conselheiros.length,
    emailEnviado,
  };
}

// Quando um conselheiro escreve uma nota interna, o síndico é avisado por
// e-mail — é o "campo de mensagem para o síndico" do alerta de SLA.
export async function avisarSindicoSobreNotaDoConselho(
  chamado: { id: number | string; titulo: string },
  conselheiro: { nome: string },
  texto: string
): Promise<void> {
  const sindicos = await usuariosPorPerfil(["sindico"]);
  if (sindicos.length === 0) return;
  const html = layoutEmail(
    `Mensagem do conselho sobre o chamado #${chamado.id}`,
    `
      <p style="font-size:14px;line-height:1.6;color:#1a1a18;margin:0 0 12px;">
        <strong>${escaparHtml(conselheiro.nome)}</strong> deixou uma nota interna no chamado
        <strong>#${chamado.id} — ${escaparHtml(chamado.titulo)}</strong>:
      </p>
      <blockquote style="margin:0 0 12px;padding:10px 14px;border-left:3px solid #2b3a4a;background:#fafaf9;font-size:14px;line-height:1.6;color:#1a1a18;white-space:pre-wrap;">${escaparHtml(texto)}</blockquote>
      <p style="font-size:14px;line-height:1.6;margin:0;">
        <a href="${URL_LAB}/condominio/chamados/${chamado.id}" style="color:#2b3a4a;">Abrir o chamado</a>
      </p>
    `
  );
  await enviarEmail(
    sindicos.map((x) => x.email),
    `Conselho: mensagem sobre o chamado #${chamado.id}`,
    html
  );
}
