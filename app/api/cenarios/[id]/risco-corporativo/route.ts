import { NextRequest, NextResponse } from "next/server";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { resolverDonoRisco } from "@/lib/resolverDono";
import { NOME_PROJETO_CORPORATIVO } from "@/lib/resumoCenario";

export const dynamic = "force-dynamic";

// B27 · POST { donoEmail | donoContatoId, pontoFocalEmail? } — registra o
// risco corporativo do cenário: um risco do projeto "Corporativo
// (transversal)" (criado no primeiro uso) com o texto do cenário e dono
// corporativo. Ele segue o fluxo normal (avaliação, planos, aceitação,
// revisão) e fica ligado ao cenário e, por ele, aos riscos dos projetos.
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  const { id } = await props.params;
  try {
    if (!/^\d+$/.test(id ?? "")) return NextResponse.json({ error: "Cenário inválido." }, { status: 400 });
    const body = await request.json().catch(() => ({}));
    const sql = sqlAuditado(guarda.usuario);
    const [cenario] = await sql`SELECT * FROM cenarios_risco WHERE id = ${id}`;
    if (!cenario) return NextResponse.json({ error: "Cenário não encontrado." }, { status: 404 });
    if (cenario.risco_corporativo_id) {
      return NextResponse.json(
        { error: `Este cenário já tem risco corporativo (#${cenario.risco_corporativo_id}).` },
        { status: 409 }
      );
    }
    const resolvido = await resolverDonoRisco(sql, body ?? {});
    if ("erro" in resolvido) return NextResponse.json({ error: resolvido.erro }, { status: 400 });
    const dono = resolvido.dono;

    await sql`
      INSERT INTO projetos (nome)
      SELECT ${NOME_PROJETO_CORPORATIVO}
      WHERE NOT EXISTS (SELECT 1 FROM projetos WHERE nome = ${NOME_PROJETO_CORPORATIVO})
    `;
    const [projeto] = await sql`SELECT id FROM projetos WHERE nome = ${NOME_PROJETO_CORPORATIVO}`;
    const [risco] = await sql`
      INSERT INTO riscos (
        projeto_id, categoria, causa, evento, consequencia, cenario_id,
        dono_email, dono_nome, dono_contato_id, ponto_focal_email, ponto_focal_nome,
        levantado_por, data_levantamento, fonte, resultado_potencial
      ) VALUES (
        ${projeto.id}, ${cenario.categoria}, ${cenario.causa}, ${cenario.evento}, ${cenario.consequencia}, ${cenario.id},
        ${dono.dono_email}, ${dono.dono_nome}, ${dono.dono_contato_id}, ${dono.ponto_focal_email}, ${dono.ponto_focal_nome},
        ${guarda.usuario.email}, (now() AT TIME ZONE 'America/Sao_Paulo')::date, 'Análise de Processo',
        ${`Risco corporativo do cenário ${cenario.codigo}: causa comum a vários projetos, com tratamento central.`}
      )
      RETURNING id
    `;
    await sql`UPDATE cenarios_risco SET risco_corporativo_id = ${risco.id} WHERE id = ${id}`;
    return NextResponse.json({ riscoId: risco.id }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao registrar o risco corporativo." }, { status: 500 });
  }
}
