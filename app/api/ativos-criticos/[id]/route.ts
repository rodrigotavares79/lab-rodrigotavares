import { NextRequest, NextResponse } from "next/server";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { validarAtivo } from "@/lib/ativosCriticos";

export const dynamic = "force-dynamic";

// B14 · PATCH: edita um ativo/processo do inventário ou muda a situação
// ({ ativo: false } inativa; some das escolhas no cadastro de riscos, mas os
// riscos já vinculados continuam apontando para ele).
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  const { id } = await props.params;
  try {
    if (!/^\d+$/.test(id ?? "")) return NextResponse.json({ error: "Ativo inválido." }, { status: 400 });
    const body = await request.json().catch(() => ({}));
    const sql = sqlAuditado(guarda.usuario);
    const [atual] = await sql`SELECT id, projeto_id, ativo FROM sistemas_criticos WHERE id = ${id}`;
    if (!atual) return NextResponse.json({ error: "Ativo não encontrado." }, { status: 404 });

    if (Object.keys(body ?? {}).length === 1 && typeof body.ativo === "boolean") {
      await sql`UPDATE sistemas_criticos SET ativo = ${body.ativo} WHERE id = ${id}`;
      return NextResponse.json({ ativo: body.ativo });
    }

    const v = validarAtivo(body ?? {});
    if ("erro" in v) return NextResponse.json({ error: v.erro }, { status: 400 });
    const a = v.ativo;
    const [duplicado] = await sql`
      SELECT id FROM sistemas_criticos
      WHERE projeto_id = ${atual.projeto_id} AND lower(nome) = lower(${a.nome}) AND ativo AND id <> ${id}
    `;
    if (duplicado) {
      return NextResponse.json({ error: "Já existe um ativo ativo com esse nome neste projeto." }, { status: 409 });
    }
    await sql`
      UPDATE sistemas_criticos
      SET nome = ${a.nome}, tipo = ${a.tipo}, area_responsavel = ${a.areaResponsavel}, descricao = ${a.descricao},
          custo_indisponibilidade_hora = ${a.custoIndisponibilidadeHora},
          custo_restauracao_hora_homem = ${a.custoRestauracaoHoraHomem}
      WHERE id = ${id}
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao salvar o ativo." }, { status: 500 });
  }
}
