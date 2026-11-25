import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { validarContato } from "@/lib/donoRisco";
import { listarUsuariosRiscos } from "@/lib/usuariosRiscos";

export const dynamic = "force-dynamic";

// B14 · Contatos de negócio: donos de risco sem acesso ao sistema.
// GET · lista (com a quantidade de riscos de cada um).
export async function GET() {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const contatos = await sql`
      SELECT c.id, c.nome, c.email, c.area, c.cargo, c.ativo, c.criado_em,
             (SELECT COUNT(*) FROM riscos r WHERE r.dono_contato_id = c.id)::int AS riscos
      FROM contatos_risco c
      ORDER BY c.ativo DESC, c.nome
    `;
    return NextResponse.json({ contatos, podeEditar: !!guarda.usuario.permissoes.editarRiscos });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar os contatos." }, { status: 500 });
  }
}

// POST · cadastra um contato (quem edita riscos).
export async function POST(request: NextRequest) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  try {
    const body = await request.json().catch(() => ({}));
    const emailsUsuarios = (await listarUsuariosRiscos()).map((u) => u.email);
    const v = validarContato(body ?? {}, emailsUsuarios);
    if ("erro" in v) return NextResponse.json({ error: v.erro }, { status: 400 });
    const c = v.contato;
    const sql = sqlAuditado(guarda.usuario);
    const [existe] = await sql`SELECT id FROM contatos_risco WHERE lower(email) = ${c.email}`;
    if (existe) return NextResponse.json({ error: "Já existe um contato com esse e-mail." }, { status: 409 });
    const [novo] = await sql`
      INSERT INTO contatos_risco (nome, email, area, cargo, criado_por_email)
      VALUES (${c.nome}, ${c.email}, ${c.area}, ${c.cargo}, ${guarda.usuario.email})
      RETURNING id
    `;
    return NextResponse.json({ id: novo.id }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao cadastrar o contato." }, { status: 500 });
  }
}
