import { NextRequest, NextResponse } from "next/server";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { podeAprovarAceitacao, rotuloAlcada } from "@/lib/perfisRiscos";
import { calcularValidoAte, validarDecisao } from "@/lib/aceitacaoRisco";
import { hojeSaoPaulo } from "@/lib/revisaoRisco";

export const dynamic = "force-dynamic";

// B16 · POST { decisao: "Aprovar" | "Recusar", motivo? }
// Aprovar: exige alçada para o nível ATUAL do risco e não ter pedido a
// aceitação. O risco passa para "Aceito" até valido_ate; a decisão conta como
// revisão periódica. Recusar exige motivo. Tentativas fora da alçada ou de
// quem pediu ficam em eventos_seguranca.
export async function POST(request: NextRequest, props: { params: Promise<{ id: string; aceitacaoId: string }> }) {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  const { id, aceitacaoId } = await props.params;
  try {
    if (!/^\d+$/.test(id ?? "") || !/^\d+$/.test(aceitacaoId ?? "")) {
      return NextResponse.json({ error: "Aceitação inválida." }, { status: 400 });
    }
    const usuario = guarda.usuario;
    const body = await request.json().catch(() => ({}));
    const decisao = body?.decisao;
    const motivo = typeof body?.motivo === "string" && body.motivo.trim() ? body.motivo.trim().slice(0, 2000) : null;

    const sql = sqlAuditado(usuario);
    const [linha] = await sql`
      SELECT a.situacao, a.validade_meses, a.solicitado_por_email, r.status AS risco_status, r.impacto_qualitativo
      FROM aceitacoes_risco a JOIN riscos r ON r.id = a.risco_id
      WHERE a.id = ${aceitacaoId} AND a.risco_id = ${id}
    `;
    if (!linha) return NextResponse.json({ error: "Aceitação não encontrada." }, { status: 404 });

    const invalida = validarDecisao({
      decisao,
      motivo,
      situacao: linha.situacao,
      aprovadorEmail: usuario.email,
      solicitanteEmail: linha.solicitado_por_email,
      temAlcada: podeAprovarAceitacao(usuario.perfil, linha.impacto_qualitativo),
      alcadaTexto: rotuloAlcada(linha.impacto_qualitativo),
      nivelRisco: linha.impacto_qualitativo,
    });
    if (invalida) {
      const bloqueio = /segregação|alçada/.test(invalida);
      if (bloqueio) {
        await sql`
          INSERT INTO eventos_seguranca (tipo, usuario_email, usuario_nome, risco_id, registro, detalhe)
          VALUES ('aceitacao_bloqueada', ${usuario.email}, ${usuario.nome}, ${Number(id)},
                  ${"aceitacoes_risco:" + aceitacaoId}, ${`${decisao}: ${invalida}`})
        `;
      }
      return NextResponse.json({ error: invalida }, { status: bloqueio ? 403 : 400 });
    }
    if (linha.risco_status === "Mitigado") {
      return NextResponse.json({ error: "Risco mitigado não pode ser aceito." }, { status: 409 });
    }

    if (decisao === "Recusar") {
      await sql`
        UPDATE aceitacoes_risco
        SET situacao = 'Recusada', decidido_por_email = ${usuario.email}, decidido_por_nome = ${usuario.nome},
            decidido_por_perfil = ${usuario.perfil}, decidido_em = now(), motivo_decisao = ${motivo}
        WHERE id = ${aceitacaoId} AND situacao = 'Pendente'
      `;
      return NextResponse.json({ situacao: "Recusada" });
    }

    const validoAte = calcularValidoAte(hojeSaoPaulo(), linha.validade_meses);
    const atualizadas = await sql`
      UPDATE aceitacoes_risco
      SET situacao = 'Aprovada', decidido_por_email = ${usuario.email}, decidido_por_nome = ${usuario.nome},
          decidido_por_perfil = ${usuario.perfil}, decidido_em = now(), motivo_decisao = ${motivo},
          valido_ate = ${validoAte}
      WHERE id = ${aceitacaoId} AND situacao = 'Pendente'
      RETURNING id
    `;
    if (atualizadas.length === 0) {
      return NextResponse.json({ error: "Esta aceitação já foi decidida por outra pessoa." }, { status: 409 });
    }
    await sql`
      UPDATE riscos
      SET status = 'Aceito', opcao_tratamento = 'Aceitar', revisado_em = now()
      WHERE id = ${id} AND status <> 'Mitigado'
    `;
    return NextResponse.json({ situacao: "Aprovada", validoAte });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao registrar a decisão." }, { status: 500 });
  }
}
