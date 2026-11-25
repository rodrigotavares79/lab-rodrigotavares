import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { listarGruposDuplicados } from "@/lib/riscosDuplicados";
import { sincronizarStatusRisco } from "@/lib/sincronizarStatusRisco";

export const dynamic = "force-dynamic";

// B19 · GET: grupos de riscos repetidos no mesmo projeto.
export async function GET() {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    return NextResponse.json({ grupos: await listarGruposDuplicados(sql) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar riscos repetidos." }, { status: 500 });
  }
}

// POST { principalId, duplicadosIds[] } — consolida os duplicados no
// principal (fn_consolidar_riscos, migration 0028, numa única transação).
export async function POST(request: NextRequest) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  try {
    const body = await request.json().catch(() => ({}));
    const principalId = Number(body?.principalId);
    const duplicados: number[] = Array.isArray(body?.duplicadosIds) ? body.duplicadosIds.map(Number) : [];
    if (!Number.isInteger(principalId) || principalId <= 0) {
      return NextResponse.json({ error: "Escolha o risco principal." }, { status: 400 });
    }
    if (duplicados.length === 0 || duplicados.some((d) => !Number.isInteger(d) || d <= 0)) {
      return NextResponse.json({ error: "Escolha ao menos um risco para consolidar." }, { status: 400 });
    }
    const sql = sqlAuditado(guarda.usuario);
    try {
      await sql`
        SELECT fn_consolidar_riscos(${principalId}::int, ${duplicados}::int[], ${guarda.usuario.email}, ${guarda.usuario.nome})
      `;
    } catch (e: any) {
      // Recusas da função (RAISE EXCEPTION) voltam com a mensagem para o usuário.
      const msg = String(e?.message || "");
      if (/Risco|risco|consolid|Escolha/.test(msg)) {
        return NextResponse.json({ error: msg.replace(/^error:\s*/i, "") }, { status: 409 });
      }
      throw e;
    }
    // Planos transferidos podem mudar o status do principal (ex.: Identificado → Em Tratamento).
    await sincronizarStatusRisco(sql, principalId);
    return NextResponse.json({ consolidados: duplicados.length, principalId });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao consolidar os riscos." }, { status: 500 });
  }
}
