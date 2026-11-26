import { NextRequest, NextResponse } from "next/server";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { CATALOGO_CONTROLES } from "@/lib/catalogoControles";
import { buscarControle, validarDecisao } from "@/lib/mapeamentoControles";

export const dynamic = "force-dynamic";

const FONTES = ["biblioteca", "palavra-chave", "manual"];

// B24 · PUT { riscoId, framework, controleId, situacao: "confirmado" | "descartado", status?, fonte?, observacao? }
// Confirma (com status) ou descarta um controle para o risco; repetir a
// chamada muda a decisão (ex.: trocar o status).
export async function PUT(request: NextRequest) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  try {
    const d = await request.json().catch(() => ({}));
    const riscoId = Number(d?.riscoId);
    if (!Number.isInteger(riscoId) || riscoId <= 0) return NextResponse.json({ error: "Risco inválido." }, { status: 400 });
    const invalido = validarDecisao(CATALOGO_CONTROLES, d ?? {});
    if (invalido) return NextResponse.json({ error: invalido }, { status: 400 });
    const c = buscarControle(CATALOGO_CONTROLES, d.framework, d.controleId)!;
    const status = d.situacao === "confirmado" ? d.status : null;
    const fonte = FONTES.includes(d?.fonte) ? d.fonte : "manual";
    const observacao = typeof d?.observacao === "string" && d.observacao.trim() ? d.observacao.trim().slice(0, 1000) : null;
    const sql = sqlAuditado(guarda.usuario);
    const [risco] = await sql`SELECT status FROM riscos WHERE id = ${riscoId}`;
    if (!risco) return NextResponse.json({ error: "Risco não encontrado." }, { status: 404 });
    if (risco.status === "Mitigado") return NextResponse.json({ error: "Risco mitigado não pode ser alterado." }, { status: 409 });
    const [linha] = await sql`
      INSERT INTO riscos_controles (risco_id, framework, controle_id, controle_titulo, situacao, status, fonte, observacao, decidido_por_email, decidido_por_nome)
      VALUES (${riscoId}, ${c.framework}, ${c.id}, ${c.titulo}, ${d.situacao}, ${status}, ${fonte}, ${observacao}, ${guarda.usuario.email}, ${guarda.usuario.nome})
      ON CONFLICT (risco_id, framework, controle_id) DO UPDATE
        SET situacao = EXCLUDED.situacao, status = EXCLUDED.status, observacao = COALESCE(EXCLUDED.observacao, riscos_controles.observacao),
            decidido_por_email = EXCLUDED.decidido_por_email, decidido_por_nome = EXCLUDED.decidido_por_nome, decidido_em = now()
      RETURNING id, situacao, status
    `;
    return NextResponse.json({ mapeamento: linha });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao gravar o mapeamento." }, { status: 500 });
  }
}

// B24 · DELETE ?riscoId&framework&controleId: desfaz a decisão (o controle
// volta a ser sugestão, se ainda for sugerido).
export async function DELETE(request: NextRequest) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  try {
    const q = request.nextUrl.searchParams;
    const riscoId = Number(q.get("riscoId"));
    if (!Number.isInteger(riscoId) || riscoId <= 0) return NextResponse.json({ error: "Risco inválido." }, { status: 400 });
    const sql = sqlAuditado(guarda.usuario);
    await sql`
      DELETE FROM riscos_controles
      WHERE risco_id = ${riscoId} AND framework = ${q.get("framework") ?? ""} AND controle_id = ${q.get("controleId") ?? ""}
        AND EXISTS (SELECT 1 FROM riscos r WHERE r.id = ${riscoId} AND r.status <> 'Mitigado')
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao desfazer o mapeamento." }, { status: 500 });
  }
}
