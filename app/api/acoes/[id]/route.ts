import { NextRequest, NextResponse } from "next/server";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { exigirPermissao } from "@/lib/riscosAuth";
import { buscarUsuarioRiscos } from "@/lib/usuariosRiscos";

export const dynamic = "force-dynamic";

const STATUS_VALIDOS = ["Não iniciado", "Em andamento", "Concluído"];

// PATCH: atualiza uma Ação (status, descrição, responsável, prazo).
// Bloqueado por completo se o risco dono do plano já estiver "Mitigado".
// B09: o responsável vem de `responsavelEmail` (usuário do sistema). Uma ação
// antiga, com responsável em texto livre e ainda não vinculada, pode ser
// vinculada uma vez mesmo com o plano concluído — só esse campo muda, e a
// mudança fica no log de alterações.
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("editarPlanos");
  if (guarda.resposta) return guarda.resposta;
  const params = await props.params;
  try {
    const { id } = params;
    if (!id || !/^\d+$/.test(id)) {
      return NextResponse.json({ error: "ID de ação inválido." }, { status: 400 });
    }

    const body = await request.json();
    const { status, descricao, responsavelEmail, prazo } = body ?? {};
    if (body && "responsavel" in body) {
      return NextResponse.json(
        { error: "Informe o responsável por responsavelEmail (usuário do sistema)." },
        { status: 400 }
      );
    }

    if (status !== undefined && !STATUS_VALIDOS.includes(status)) {
      return NextResponse.json(
        { error: `Status inválido. Use um de: ${STATUS_VALIDOS.join(", ")}.` },
        { status: 400 }
      );
    }

    const sql = sqlAuditado(guarda.usuario);

    const atualRows = await sql`
      SELECT a.descricao, a.responsavel, a.responsavel_email, a.prazo, a.status,
             pa.status AS plano_status, r.status AS risco_status
      FROM acoes a
      JOIN planos_acao pa ON pa.id = a.plano_acao_id
      JOIN riscos r ON r.id = pa.risco_id
      WHERE a.id = ${id}
    `;
    if (atualRows.length === 0) {
      return NextResponse.json({ error: "Ação não encontrada." }, { status: 404 });
    }
    const atual = atualRows[0];

    if (atual.risco_status === "Mitigado") {
      return NextResponse.json(
        { error: "O risco desta ação já foi mitigado. Nada pode mais ser alterado." },
        { status: 409 }
      );
    }

    let responsavel: { nome: string; email: string } | null = null;
    if (responsavelEmail !== undefined) {
      responsavel = await buscarUsuarioRiscos(responsavelEmail);
      if (!responsavel) {
        return NextResponse.json(
          { error: "Escolha o responsável na lista de usuários do sistema." },
          { status: 400 }
        );
      }
    }

    // Vínculo de ação antiga (B09): só o responsável, uma única vez.
    const somenteVinculo =
      responsavel !== null &&
      !atual.responsavel_email &&
      status === undefined &&
      descricao === undefined &&
      prazo === undefined;

    // Plano concluído (aguardando ou já com auditoria): as ações ficam
    // congeladas para que a Auditoria avalie exatamente o que foi entregue.
    if (atual.plano_status === "Concluído" && !somenteVinculo) {
      return NextResponse.json(
        { error: "O plano desta ação já foi concluído. Reabra o plano para alterar as ações." },
        { status: 409 }
      );
    }

    const rows = await sql`
      UPDATE acoes
      SET descricao = ${descricao ?? atual.descricao},
          responsavel = ${responsavel ? responsavel.nome : atual.responsavel},
          responsavel_email = ${responsavel ? responsavel.email : atual.responsavel_email},
          prazo = ${prazo !== undefined ? prazo : atual.prazo},
          status = ${status ?? atual.status}
      WHERE id = ${id}
      RETURNING id, plano_acao_id, descricao, responsavel, responsavel_email, prazo, status, criado_em
    `;

    return NextResponse.json({ acao: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno ao atualizar a ação." }, { status: 500 });
  }
}
