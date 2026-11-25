import { NextRequest, NextResponse } from "next/server";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sincronizarStatusRisco } from "@/lib/sincronizarStatusRisco";
import { motivoConflitoAuditoria } from "@/lib/segregacaoFuncoes";

export const dynamic = "force-dynamic";

// POST { resultado: "Conforme" | "Não conforme", comentario?: string }
// Classifica o encerramento de um plano de ação. Só coordenador, gerente ou
// administrador (perfilRiscos no Clerk).
// - Conforme: evidência validada; comentário opcional.
// - Não conforme: comentário obrigatório; o plano volta a ficar Aberto para
//   correção e entra de novo na fila quando for concluído outra vez.
export async function POST(request: NextRequest, props: { params: Promise<{ planoId: string }> }) {
  const { planoId } = await props.params;
  try {
    const guarda = await exigirPermissao("auditar");
    if (guarda.resposta) return guarda.resposta;
    const usuario = guarda.usuario;
    if (!/^\d+$/.test(planoId ?? "")) {
      return NextResponse.json({ error: "ID de plano de ação inválido." }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const resultado = body?.resultado;
    const comentario = typeof body?.comentario === "string" && body.comentario.trim() ? body.comentario.trim().slice(0, 2000) : null;

    if (resultado !== "Conforme" && resultado !== "Não conforme") {
      return NextResponse.json({ error: "Resultado inválido." }, { status: 400 });
    }
    if (resultado === "Não conforme" && !comentario) {
      return NextResponse.json(
        { error: "Informe o motivo da não conformidade no comentário." },
        { status: 400 }
      );
    }

    const sql = sqlAuditado(guarda.usuario);
    const rows = await sql`
      SELECT pa.status, pa.auditoria_status, pa.risco_id, pa.criado_por_email, r.status AS risco_status
      FROM planos_acao pa JOIN riscos r ON r.id = pa.risco_id
      WHERE pa.id = ${planoId}
    `;
    if (rows.length === 0) return NextResponse.json({ error: "Plano de ação não encontrado." }, { status: 404 });
    const plano = rows[0];
    if (plano.status !== "Concluído" || plano.auditoria_status !== "Pendente") {
      return NextResponse.json(
        { error: "Este plano não está aguardando auditoria (pode já ter sido auditado por outra pessoa)." },
        { status: 409 }
      );
    }
    if (plano.risco_status === "Mitigado") {
      return NextResponse.json({ error: "O risco deste plano já foi mitigado." }, { status: 409 });
    }

    // B07: segregação de funções — vale para todos os perfis, inclusive
    // Administrador. A tentativa bloqueada fica em eventos_seguranca.
    const acoesPlano = await sql`SELECT responsavel_email, responsavel FROM acoes WHERE plano_acao_id = ${planoId}`;
    const conflito = motivoConflitoAuditoria({
      auditorEmail: usuario.email,
      criadoPorEmail: plano.criado_por_email,
      acoes: acoesPlano as any[],
    });
    if (conflito) {
      await sql`
        INSERT INTO eventos_seguranca (tipo, usuario_email, usuario_nome, risco_id, registro, detalhe)
        VALUES ('auditoria_bloqueada_segregacao', ${usuario.email}, ${usuario.nome}, ${plano.risco_id},
                ${"planos_acao:" + planoId}, ${`${resultado}: ${conflito}`})
      `;
      return NextResponse.json({ error: conflito }, { status: 403 });
    }

    const novoStatusPlano = resultado === "Conforme" ? "Concluído" : "Aberto";

    // Atualização condicional (auditoria_status = 'Pendente') evita duas
    // decisões simultâneas sobre o mesmo plano.
    const atualizados = await sql`
      UPDATE planos_acao
      SET auditoria_status = ${resultado},
          status = ${novoStatusPlano},
          concluido_em = CASE WHEN ${resultado} = 'Conforme' THEN concluido_em ELSE NULL END,
          auditado_em = now(),
          auditado_por_nome = ${usuario.nome},
          auditado_por_email = ${usuario.email},
          auditoria_comentario = ${comentario}
      WHERE id = ${planoId} AND auditoria_status = 'Pendente'
      RETURNING id, status, auditoria_status, auditado_em, auditado_por_nome, auditoria_comentario
    `;
    if (atualizados.length === 0) {
      return NextResponse.json({ error: "Este plano já foi auditado por outra pessoa." }, { status: 409 });
    }

    await sql`
      INSERT INTO planos_acao_auditorias (plano_acao_id, resultado, comentario, auditor_nome, auditor_email)
      VALUES (${planoId}, ${resultado}, ${comentario}, ${usuario.nome}, ${usuario.email})
    `;

    // Garante que o risco está Em Tratamento (ex.: plano reprovado e reaberto).
    // Nunca promove para Mitigado sozinho: isso é decisão de quem reavalia.
    await sincronizarStatusRisco(sql, plano.risco_id);

    return NextResponse.json({ plano: atualizados[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao registrar a auditoria." }, { status: 500 });
  }
}
