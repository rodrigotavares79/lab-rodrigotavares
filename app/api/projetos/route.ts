import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { normalizarNomeProjeto, projetoComMesmoNome, validarNomeProjeto } from "@/lib/projetosRegras";

export const dynamic = "force-dynamic";

// GET: projetos. ?ativos=1 só os ativos (listas de cadastro); sem ele, todos
// (filtros e relatórios continuam achando projetos inativos). ?detalhes=1
// traz o uso de cada projeto, para a tela de administração (B29).
export async function GET(request: NextRequest) {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const p = request.nextUrl.searchParams;
    const soAtivos = p.get("ativos") === "1";
    const rows = p.get("detalhes") === "1"
      ? await sql`
          SELECT p.id, p.nome, p.ativo, p.descricao, p.criado_em,
                 (SELECT COUNT(*) FROM riscos r WHERE r.projeto_id = p.id)::int AS riscos,
                 (SELECT COUNT(*) FROM assessments a WHERE a.projeto_id = p.id)::int AS assessments,
                 (SELECT COUNT(*) FROM sistemas_criticos s WHERE s.projeto_id = p.id)::int AS ativos_criticos
          FROM projetos p
          WHERE ${!soAtivos} OR p.ativo
          ORDER BY p.ativo DESC, p.nome ASC`
      : await sql`SELECT id, nome, ativo FROM projetos WHERE ${!soAtivos} OR ativo ORDER BY nome ASC`;
    return NextResponse.json({ projetos: rows, podeGerir: guarda.usuario.permissoes.gerirUsuarios });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar projetos." }, { status: 500 });
  }
}

// POST: cadastra um projeto (Administrador e CISO). Corpo: { nome, descricao? }.
export async function POST(request: NextRequest) {
  const guarda = await exigirPermissao("gerirUsuarios");
  if (guarda.resposta) return guarda.resposta;
  try {
    const d = await request.json().catch(() => ({}));
    const erro = validarNomeProjeto(d?.nome);
    if (erro) return NextResponse.json({ error: erro }, { status: 400 });
    const nome = normalizarNomeProjeto(d.nome);
    const sql = sqlAuditado(guarda.usuario);
    const existentes = (await sql`SELECT id, nome FROM projetos`) as { id: number; nome: string }[];
    const igual = projetoComMesmoNome(nome, existentes);
    if (igual) return NextResponse.json({ error: `Já existe o projeto "${igual.nome}".` }, { status: 409 });
    const descricao = typeof d.descricao === "string" && d.descricao.trim() ? d.descricao.trim().slice(0, 1000) : null;
    const [criado] = await sql`
      INSERT INTO projetos (nome, descricao, ativo, criado_por_email) VALUES (${nome}, ${descricao}, true, ${guarda.usuario.email})
      RETURNING id, nome
    `;
    return NextResponse.json({ projeto: criado }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao cadastrar o projeto." }, { status: 500 });
  }
}
