import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getUsuarioRiscos } from "@/lib/riscosAuth";

export const dynamic = "force-dynamic";

// GET: alterações registradas no log (B06) para um risco e tudo o que
// pertence a ele (fatores, planos, ações, evidências, auditorias), da mais
// recente para a mais antiga. Quem não pode ver a auditoria não recebe os
// registros de auditoria.
export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  try {
    const usuario = await getUsuarioRiscos();
    if (!usuario) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    if (!/^\d+$/.test(id ?? "")) {
      return NextResponse.json({ error: "ID de risco inválido." }, { status: 400 });
    }
    const verAuditoria = usuario.permissoes.verAuditoria;

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const registros = await sql`
      SELECT id, ocorrido_em, tabela, registro_id, operacao, campo,
             valor_anterior, valor_novo, usuario_email, usuario_nome, origem, transacao
      FROM log_alteracoes
      WHERE risco_id = ${id}
        AND (
          ${verAuditoria}::boolean
          OR (
            tabela <> 'planos_acao_auditorias'
            AND COALESCE(campo, '') NOT LIKE 'auditoria%'
            AND COALESCE(campo, '') NOT LIKE 'auditado%'
          )
        )
      ORDER BY ocorrido_em DESC, id DESC
      LIMIT 500
    `;

    return NextResponse.json({ registros });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar o histórico do risco." }, { status: 500 });
  }
}
