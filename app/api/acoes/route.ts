import { NextRequest, NextResponse } from "next/server";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { exigirPermissao } from "@/lib/riscosAuth";
import { buscarUsuarioRiscos } from "@/lib/usuariosRiscos";

// O driver HTTP do Neon usa fetch() por baixo dos panos, e o Next cacheia
// fetch() por padrão em rotas sem uso de searchParams/cookies/headers —
// force-dynamic garante leitura sempre fresca do banco.
export const dynamic = "force-dynamic";

// POST: cria uma nova Ação dentro de um Plano de Ação já existente.
// Bloqueado se:
// - o Plano de Ação já estiver "Concluído" (não se cria ação nova nele), ou
// - o risco dono do plano já estiver "Mitigado" (tudo congela).
export async function POST(request: NextRequest) {
  const guarda = await exigirPermissao("editarPlanos");
  if (guarda.resposta) return guarda.resposta;
  try {
    const body = await request.json();
    const { planoAcaoId, descricao, responsavelEmail, prazo } = body ?? {};

    if (!planoAcaoId) {
      return NextResponse.json({ error: "planoAcaoId é obrigatório." }, { status: 400 });
    }
    if (!descricao || typeof descricao !== "string" || !descricao.trim()) {
      return NextResponse.json({ error: "Descrição da ação é obrigatória." }, { status: 400 });
    }

    // B09: o responsável é escolhido entre os usuários do sistema.
    const responsavel = await buscarUsuarioRiscos(responsavelEmail);
    if (!responsavel) {
      return NextResponse.json(
        { error: "Escolha o responsável na lista de usuários do sistema." },
        { status: 400 }
      );
    }

    const sql = sqlAuditado(guarda.usuario);

    const planoRows = await sql`
      SELECT pa.id, pa.status AS plano_status, r.status AS risco_status
      FROM planos_acao pa
      JOIN riscos r ON r.id = pa.risco_id
      WHERE pa.id = ${planoAcaoId}
    `;
    if (planoRows.length === 0) {
      return NextResponse.json({ error: "Plano de ação não encontrado." }, { status: 404 });
    }
    const plano = planoRows[0];

    if (plano.risco_status === "Mitigado") {
      return NextResponse.json(
        { error: "O risco deste plano já foi mitigado. Nada pode mais ser cadastrado." },
        { status: 409 }
      );
    }
    if (plano.plano_status === "Concluído") {
      return NextResponse.json(
        { error: "Este plano de ação já foi concluído. Não é possível cadastrar novas ações nele." },
        { status: 409 }
      );
    }

    const rows = await sql`
      INSERT INTO acoes (plano_acao_id, descricao, responsavel, responsavel_email, prazo, status)
      VALUES (${planoAcaoId}, ${descricao.trim()}, ${responsavel.nome}, ${responsavel.email}, ${prazo || null}, 'Não iniciado')
      RETURNING id, plano_acao_id, descricao, responsavel, responsavel_email, prazo, status, criado_em
    `;

    return NextResponse.json({ acao: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno ao cadastrar a ação." }, { status: 500 });
  }
}
