import { NextRequest, NextResponse } from "next/server";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { podeTrocarAtivo } from "@/lib/ativosCriticos";
import { resolverDonoRisco } from "@/lib/resolverDono";

export const dynamic = "force-dynamic";

// B14 · PUT { donoEmail | donoContatoId, pontoFocalEmail?, ativoId? } — define
// o dono do risco (usuário do módulo ou contato de negócio; com contato, o
// ponto focal Analista GRC é obrigatório) e o ativo ou processo afetado. O
// ativo precisa ser do mesmo projeto e estar ativo; só pode ser trocado
// enquanto o risco não tem estimativa financeira (calculada com os custos do
// ativo anterior).
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  const { id } = await props.params;
  try {
    if (!/^\d+$/.test(id ?? "")) return NextResponse.json({ error: "ID de risco inválido." }, { status: 400 });
    const body = await request.json().catch(() => ({}));
    const sql = sqlAuditado(guarda.usuario);
    const resolvido = await resolverDonoRisco(sql, body ?? {});
    if ("erro" in resolvido) return NextResponse.json({ error: resolvido.erro }, { status: 400 });
    const dono = resolvido.dono;
    const [risco] = await sql`
      SELECT projeto_id, status, sistema_critico_id, impacto_critico_total, impacto_alto_total
      FROM riscos WHERE id = ${id}
    `;
    if (!risco) return NextResponse.json({ error: "Risco não encontrado." }, { status: 404 });
    if (risco.status === "Mitigado") {
      return NextResponse.json({ error: "Risco mitigado não pode ter dono ou ativo alterados." }, { status: 409 });
    }

    let ativoId: number | null = risco.sistema_critico_id;
    if (body.ativoId !== undefined) {
      const novo = body.ativoId === null || body.ativoId === "" ? null : Number(body.ativoId);
      if (novo !== null && !Number.isInteger(novo)) return NextResponse.json({ error: "Ativo inválido." }, { status: 400 });
      if (novo !== risco.sistema_critico_id) {
        if (!podeTrocarAtivo(risco)) {
          return NextResponse.json(
            { error: "Este risco tem estimativa financeira calculada com o ativo atual; o ativo não pode ser trocado." },
            { status: 409 }
          );
        }
        if (novo !== null) {
          const [ativo] = await sql`SELECT projeto_id, ativo FROM sistemas_criticos WHERE id = ${novo}`;
          if (!ativo || ativo.projeto_id !== risco.projeto_id) {
            return NextResponse.json({ error: "O ativo precisa ser do mesmo projeto do risco." }, { status: 400 });
          }
          if (!ativo.ativo) return NextResponse.json({ error: "Este ativo está inativo no inventário." }, { status: 400 });
        }
        ativoId = novo;
      }
    }

    await sql`
      UPDATE riscos
      SET dono_email = ${dono.dono_email}, dono_nome = ${dono.dono_nome}, dono_contato_id = ${dono.dono_contato_id},
          ponto_focal_email = ${dono.ponto_focal_email}, ponto_focal_nome = ${dono.ponto_focal_nome},
          sistema_critico_id = ${ativoId}
      WHERE id = ${id}
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao salvar o dono e o ativo do risco." }, { status: 500 });
  }
}
