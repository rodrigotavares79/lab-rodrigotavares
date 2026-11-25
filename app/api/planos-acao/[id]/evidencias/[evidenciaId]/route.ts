import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { exigirPermissao, getUsuarioRiscos } from "@/lib/riscosAuth";
import { apagarEvidencia, armazenamentoEvidenciasConfigurado, lerEvidencia } from "@/lib/riscosEvidencias";

export const dynamic = "force-dynamic";

function idsValidos(id?: string, evidenciaId?: string) {
  return /^\d+$/.test(id ?? "") && /^\d+$/.test(evidenciaId ?? "");
}

// GET: entrega o arquivo da evidência (única porta de acesso; exige login).
export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string; evidenciaId: string }> }
) {
  const { id, evidenciaId } = await props.params;
  try {
    const usuario = await getUsuarioRiscos();
    if (!usuario) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    if (!idsValidos(id, evidenciaId)) return NextResponse.json({ error: "Evidência inválida." }, { status: 400 });

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const rows = await sql`
      SELECT arquivo_url, tipo_arquivo, nome_arquivo
      FROM planos_acao_evidencias
      WHERE id = ${evidenciaId} AND plano_acao_id = ${id}
    `;
    if (rows.length === 0) return NextResponse.json({ error: "Evidência não encontrada." }, { status: 404 });
    if (!armazenamentoEvidenciasConfigurado()) {
      return NextResponse.json({ error: "Armazenamento de evidências não configurado." }, { status: 503 });
    }

    const resultado = await lerEvidencia(rows[0].arquivo_url);
    if (!resultado || resultado.statusCode !== 200) {
      return NextResponse.json({ error: "Arquivo da evidência não encontrado." }, { status: 404 });
    }

    const nome = String(rows[0].nome_arquivo).replace(/["\r\n]/g, "");
    return new NextResponse(resultado.stream, {
      status: 200,
      headers: {
        "Content-Type": resultado.blob.contentType || rows[0].tipo_arquivo || "application/octet-stream",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(nome)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao abrir a evidência." }, { status: 500 });
  }
}

// DELETE: remove uma evidência enviada por engano — só com o plano Aberto.
export async function DELETE(
  _request: NextRequest,
  props: { params: Promise<{ id: string; evidenciaId: string }> }
) {
  const { id, evidenciaId } = await props.params;
  try {
    const guarda = await exigirPermissao("editarPlanos");
    if (guarda.resposta) return guarda.resposta;
    if (!idsValidos(id, evidenciaId)) return NextResponse.json({ error: "Evidência inválida." }, { status: 400 });

    const sql = sqlAuditado(guarda.usuario);
    const rows = await sql`
      SELECT e.arquivo_url, pa.status, r.status AS risco_status
      FROM planos_acao_evidencias e
      JOIN planos_acao pa ON pa.id = e.plano_acao_id
      JOIN riscos r ON r.id = pa.risco_id
      WHERE e.id = ${evidenciaId} AND e.plano_acao_id = ${id}
    `;
    if (rows.length === 0) return NextResponse.json({ error: "Evidência não encontrada." }, { status: 404 });
    if (rows[0].status === "Concluído" || rows[0].risco_status === "Mitigado") {
      return NextResponse.json(
        { error: "Plano concluído: as evidências não podem mais ser alteradas." },
        { status: 409 }
      );
    }

    await sql`DELETE FROM planos_acao_evidencias WHERE id = ${evidenciaId}`;
    try {
      await apagarEvidencia(rows[0].arquivo_url);
    } catch (err) {
      console.error("Evidência removida do banco, mas o arquivo não pôde ser apagado:", err);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao remover a evidência." }, { status: 500 });
  }
}
