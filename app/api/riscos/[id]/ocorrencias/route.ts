import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { podeRegistrarOcorrencia } from "@/lib/semelhancaRisco";

export const dynamic = "force-dynamic";

// B19 · Ocorrências de um risco: cada vez que o mesmo risco é identificado
// de novo, em vez de virar um cadastro repetido.
export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  const { id } = await props.params;
  try {
    if (!/^\d+$/.test(id ?? "")) return NextResponse.json({ error: "ID de risco inválido." }, { status: 400 });
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const ocorrencias = await sql`
      SELECT id, to_char(data_levantamento, 'YYYY-MM-DD') AS data_levantamento, fonte, observacao,
             registrado_por_nome, registrado_por_email, criado_em
      FROM ocorrencias_risco WHERE risco_id = ${id}
      ORDER BY COALESCE(data_levantamento, criado_em::date) DESC, id DESC
    `;
    return NextResponse.json({ ocorrencias });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar as ocorrências." }, { status: 500 });
  }
}

// POST { dataLevantamento?, fonte?, observacao } — registra nova ocorrência.
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  const { id } = await props.params;
  try {
    if (!/^\d+$/.test(id ?? "")) return NextResponse.json({ error: "ID de risco inválido." }, { status: 400 });
    const body = await request.json().catch(() => ({}));
    const observacao = typeof body?.observacao === "string" ? body.observacao.trim().slice(0, 4000) : "";
    if (observacao.length < 10) {
      return NextResponse.json({ error: "Descreva a ocorrência (pelo menos 10 caracteres)." }, { status: 400 });
    }
    const data = typeof body?.dataLevantamento === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dataLevantamento)
      ? body.dataLevantamento
      : null;
    const fonte = typeof body?.fonte === "string" && body.fonte.trim() ? body.fonte.trim().slice(0, 120) : null;

    const sql = sqlAuditado(guarda.usuario);
    const [risco] = await sql`SELECT status FROM riscos WHERE id = ${id}`;
    if (!risco) return NextResponse.json({ error: "Risco não encontrado." }, { status: 404 });
    const bloqueio = podeRegistrarOcorrencia(risco.status);
    if (bloqueio) return NextResponse.json({ error: bloqueio }, { status: 409 });

    const [nova] = await sql`
      INSERT INTO ocorrencias_risco (risco_id, data_levantamento, fonte, observacao, registrado_por_email, registrado_por_nome)
      VALUES (${id}, ${data}, ${fonte}, ${observacao}, ${guarda.usuario.email}, ${guarda.usuario.nome})
      RETURNING id
    `;
    return NextResponse.json({ id: nova.id }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao registrar a ocorrência." }, { status: 500 });
  }
}
