import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { normalizarNomeProjeto, projetoComMesmoNome, validarSolicitacao } from "@/lib/projetosRegras";

export const dynamic = "force-dynamic";

// B29 · GET: solicitações de inclusão de projeto. Quem administra vê todas;
// os demais, só as próprias (para acompanhar a decisão).
export async function GET() {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const u = guarda.usuario;
    const todas = u.permissoes.gerirUsuarios;
    const solicitacoes = await sql`
      SELECT s.id, s.nome, s.justificativa, s.situacao, s.solicitado_por_email, s.solicitado_por_nome, s.solicitado_em,
             s.decidido_por_nome, s.decidido_em, s.motivo_recusa, s.projeto_id, p.nome AS projeto_nome
      FROM solicitacoes_projeto s LEFT JOIN projetos p ON p.id = s.projeto_id
      WHERE ${todas} OR lower(s.solicitado_por_email) = lower(${u.email})
      ORDER BY (s.situacao = 'Pendente') DESC, s.solicitado_em DESC
      LIMIT 100
    `;
    return NextResponse.json({ solicitacoes, podeDecidir: todas, email: u.email });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar as solicitações." }, { status: 500 });
  }
}

// B29 · POST: pede a inclusão de um projeto que não está na lista.
// Corpo: { nome, justificativa }. Exige editarRiscos (quem cadastra riscos,
// ativos e assessments).
export async function POST(request: NextRequest) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  try {
    const d = await request.json().catch(() => ({}));
    const erro = validarSolicitacao(d ?? {});
    if (erro) return NextResponse.json({ error: erro }, { status: 400 });
    const nome = normalizarNomeProjeto(d.nome);
    const sql = sqlAuditado(guarda.usuario);
    const projetos = (await sql`SELECT id, nome, ativo FROM projetos`) as { id: number; nome: string; ativo: boolean }[];
    const igual = projetoComMesmoNome(nome, projetos);
    if (igual) {
      return NextResponse.json(
        { error: igual.ativo ? `O projeto "${igual.nome}" já existe na lista.` : `O projeto "${igual.nome}" existe, mas está inativo. Peça a reativação a um Administrador ou CISO.` },
        { status: 409 }
      );
    }
    const pendentes = (await sql`SELECT id, nome FROM solicitacoes_projeto WHERE situacao = 'Pendente'`) as { id: number; nome: string }[];
    const repetida = projetoComMesmoNome(nome, pendentes);
    if (repetida) return NextResponse.json({ error: `Já há uma solicitação pendente para "${repetida.nome}".` }, { status: 409 });
    const [s] = await sql`
      INSERT INTO solicitacoes_projeto (nome, justificativa, solicitado_por_email, solicitado_por_nome)
      VALUES (${nome}, ${String(d.justificativa).trim().slice(0, 1000)}, ${guarda.usuario.email}, ${guarda.usuario.nome})
      RETURNING id
    `;
    return NextResponse.json({ solicitacao: s }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao registrar a solicitação." }, { status: 500 });
  }
}
