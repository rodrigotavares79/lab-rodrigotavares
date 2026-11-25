import { NextRequest, NextResponse } from "next/server";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { validarCenario, TAMANHO_MAXIMO_CAMPO } from "@/lib/cenarioRisco";

export const dynamic = "force-dynamic";

function texto(v: unknown, max = TAMANHO_MAXIMO_CAMPO + 1): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().replace(/\s+/g, " ");
  return t ? t.slice(0, max) : null;
}

// B13 · PUT { causa, evento, consequencia, gatilho?, detalhamento? }
// Edita o cenário do risco. O título é remontado pelo banco (trigger
// fn_titulo_risco) e cada campo alterado vai para o log de alterações.
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  const { id } = await props.params;
  try {
    if (!/^\d+$/.test(id ?? "")) {
      return NextResponse.json({ error: "ID de risco inválido." }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));
    const cenario = {
      causa: texto(body?.causa),
      evento: texto(body?.evento),
      consequencia: texto(body?.consequencia),
    };
    const invalido = validarCenario(cenario);
    if (invalido) return NextResponse.json({ error: invalido }, { status: 400 });
    const gatilho = texto(body?.gatilho, 500);
    const detalhamento = texto(body?.detalhamento, 4000);

    const sql = sqlAuditado(guarda.usuario);
    const [atual] = await sql`SELECT status FROM riscos WHERE id = ${id}`;
    if (!atual) return NextResponse.json({ error: "Risco não encontrado." }, { status: 404 });
    if (atual.status === "Mitigado") {
      return NextResponse.json({ error: "Risco mitigado não pode ter o cenário alterado." }, { status: 409 });
    }
    const linhas = await sql`
      UPDATE riscos
      SET causa = ${cenario.causa}, evento = ${cenario.evento}, consequencia = ${cenario.consequencia},
          gatilho = ${gatilho}, resultado_potencial = ${detalhamento}
      WHERE id = ${id}
      RETURNING titulo
    `;
    if (linhas.length === 0) return NextResponse.json({ error: "Risco não encontrado." }, { status: 404 });
    return NextResponse.json({ titulo: linhas[0].titulo });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao salvar o cenário do risco." }, { status: 500 });
  }
}
