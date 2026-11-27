import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { proximoCodigoPergunta, validarPergunta } from "@/lib/assessmentRegras";

export const dynamic = "force-dynamic";

// B29 · GET: banco de perguntas, com quantas vezes cada uma foi respondida.
export async function GET() {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const perguntas = await sql`
      SELECT p.id, p.codigo, p.area, p.texto, p.tipo, p.ativa,
             (SELECT COUNT(*) FROM assessment_respostas r WHERE r.pergunta_id = p.id)::int AS respostas
      FROM assessment_perguntas p
      ORDER BY p.area_ordem, p.ordem
    `;
    return NextResponse.json({ perguntas, podeEditar: guarda.usuario.permissoes.gerirUsuarios });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar as perguntas." }, { status: 500 });
  }
}

// B29 · POST: cadastra uma pergunta (Administrador e CISO). Corpo:
// { area, texto, tipo }. O código é o próximo livre da área. Vale para
// assessments novos e para os que ainda estão em Rascunho naquela área.
export async function POST(request: NextRequest) {
  const guarda = await exigirPermissao("gerirUsuarios");
  if (guarda.resposta) return guarda.resposta;
  try {
    const d = await request.json().catch(() => ({}));
    const erro = validarPergunta(d ?? {});
    if (erro) return NextResponse.json({ error: erro }, { status: 400 });
    const sql = sqlAuditado(guarda.usuario);
    const codigos = (await sql`SELECT codigo FROM assessment_perguntas`).map((c: any) => c.codigo);
    const prox = proximoCodigoPergunta(d.area, codigos)!;
    const [criada] = await sql`
      INSERT INTO assessment_perguntas (codigo, area, area_ordem, ordem, texto, tipo)
      VALUES (${prox.codigo}, ${d.area}, ${prox.areaOrdem}, ${prox.ordem}, ${String(d.texto).trim().replace(/\s+/g, " ")}, ${d.tipo})
      RETURNING id, codigo
    `;
    return NextResponse.json({ pergunta: criada }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao cadastrar a pergunta." }, { status: 500 });
  }
}
