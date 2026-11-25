import { NextRequest, NextResponse } from "next/server";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { validarContato } from "@/lib/donoRisco";
import { listarUsuariosRiscos } from "@/lib/usuariosRiscos";

export const dynamic = "force-dynamic";

// B14 · PATCH: edita um contato ou muda a situação ({ ativo }). Ao editar,
// nome e e-mail são atualizados também nos riscos de que ele é dono.
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  const { id } = await props.params;
  try {
    if (!/^\d+$/.test(id ?? "")) return NextResponse.json({ error: "Contato inválido." }, { status: 400 });
    const body = await request.json().catch(() => ({}));
    const sql = sqlAuditado(guarda.usuario);
    const [atual] = await sql`SELECT id FROM contatos_risco WHERE id = ${id}`;
    if (!atual) return NextResponse.json({ error: "Contato não encontrado." }, { status: 404 });

    if (Object.keys(body ?? {}).length === 1 && typeof body.ativo === "boolean") {
      await sql`UPDATE contatos_risco SET ativo = ${body.ativo} WHERE id = ${id}`;
      return NextResponse.json({ ativo: body.ativo });
    }

    const emailsUsuarios = (await listarUsuariosRiscos()).map((u) => u.email);
    const v = validarContato(body ?? {}, emailsUsuarios);
    if ("erro" in v) return NextResponse.json({ error: v.erro }, { status: 400 });
    const c = v.contato;
    const [outro] = await sql`SELECT id FROM contatos_risco WHERE lower(email) = ${c.email} AND id <> ${id}`;
    if (outro) return NextResponse.json({ error: "Já existe um contato com esse e-mail." }, { status: 409 });
    // Um único comando (CTE) para contato e riscos mudarem juntos.
    await sql`
      WITH contato AS (
        UPDATE contatos_risco SET nome = ${c.nome}, email = ${c.email}, area = ${c.area}, cargo = ${c.cargo}
        WHERE id = ${id}
        RETURNING id, nome, email
      )
      UPDATE riscos r SET dono_nome = contato.nome, dono_email = contato.email
      FROM contato
      WHERE r.dono_contato_id = contato.id
        AND (r.dono_nome IS DISTINCT FROM contato.nome OR r.dono_email IS DISTINCT FROM contato.email)
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao salvar o contato." }, { status: 500 });
  }
}
