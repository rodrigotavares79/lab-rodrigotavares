import { NextRequest, NextResponse } from "next/server";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { normalizarNomeProjeto, projetoComMesmoNome, validarDecisao } from "@/lib/projetosRegras";

export const dynamic = "force-dynamic";

// B29 · POST: decide uma solicitação de inclusão (Administrador e CISO).
// Corpo: { decisao: "Aprovada", nome, projetoExistenteId? } ou
// { decisao: "Recusada", motivo }. Aprovar cria o projeto (ou aponta um que
// já existe, reativando-o se estiver inativo).
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("gerirUsuarios");
  if (guarda.resposta) return guarda.resposta;
  const { id } = await props.params;
  if (!/^\d+$/.test(id ?? "")) return NextResponse.json({ error: "Solicitação inválida." }, { status: 400 });
  try {
    const d = await request.json().catch(() => ({}));
    const u = guarda.usuario;
    const sql = sqlAuditado(u);
    const [s] = await sql`SELECT id, situacao, solicitado_por_email FROM solicitacoes_projeto WHERE id = ${Number(id)}`;
    if (!s) return NextResponse.json({ error: "Solicitação não encontrada." }, { status: 404 });
    const erro = validarDecisao(d ?? {}, { situacao: s.situacao, solicitante: s.solicitado_por_email, decisor: u.email });
    if (erro) return NextResponse.json({ error: erro }, { status: 409 });

    if (d.decisao === "Recusada") {
      await sql`
        UPDATE solicitacoes_projeto SET situacao = 'Recusada', motivo_recusa = ${String(d.motivo).trim().slice(0, 1000)},
          decidido_por_email = ${u.email}, decidido_por_nome = ${u.nome}, decidido_em = now()
        WHERE id = ${s.id} AND situacao = 'Pendente'
      `;
      return NextResponse.json({ ok: true });
    }

    let projetoId: number;
    if (d.projetoExistenteId) {
      const [p] = await sql`SELECT id FROM projetos WHERE id = ${Number(d.projetoExistenteId)}`;
      if (!p) return NextResponse.json({ error: "Projeto existente não encontrado." }, { status: 404 });
      await sql`UPDATE projetos SET ativo = true WHERE id = ${p.id} AND NOT ativo`;
      projetoId = p.id;
    } else {
      const nome = normalizarNomeProjeto(d.nome);
      const existentes = (await sql`SELECT id, nome FROM projetos`) as { id: number; nome: string }[];
      const igual = projetoComMesmoNome(nome, existentes);
      if (igual) return NextResponse.json({ error: `Já existe o projeto "${igual.nome}". Aprove apontando para ele.`, projetoExistenteId: igual.id }, { status: 409 });
      const [p] = await sql`INSERT INTO projetos (nome, ativo, criado_por_email) VALUES (${nome}, true, ${u.email}) RETURNING id`;
      projetoId = p.id;
    }
    await sql`
      UPDATE solicitacoes_projeto SET situacao = 'Aprovada', projeto_id = ${projetoId},
        decidido_por_email = ${u.email}, decidido_por_nome = ${u.nome}, decidido_em = now()
      WHERE id = ${s.id} AND situacao = 'Pendente'
    `;
    return NextResponse.json({ ok: true, projetoId });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao decidir a solicitação." }, { status: 500 });
  }
}
