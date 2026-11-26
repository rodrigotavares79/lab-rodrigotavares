import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { numero, validarKri } from "@/lib/kriRisco";
import { listarKris } from "@/lib/kriServidor";

export const dynamic = "force-dynamic";

// B21 · GET: o KRI e todas as medições.
export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  const { id } = await props.params;
  try {
    if (!/^\d+$/.test(id ?? "")) return NextResponse.json({ error: "KRI inválido." }, { status: 400 });
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const [kri] = await listarKris(sql, { id: Number(id) });
    if (!kri) return NextResponse.json({ error: "KRI não encontrado." }, { status: 404 });
    const medicoes = await sql`
      SELECT id, to_char(referencia, 'YYYY-MM-DD') AS referencia, valor, faixa, origem, observacao,
             registrado_por_nome, registrado_em
      FROM kri_medicoes WHERE kri_id = ${id} ORDER BY referencia DESC
    `;
    return NextResponse.json({ kri, medicoes, podeEditar: guarda.usuario.permissoes.editarRiscos });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar o KRI." }, { status: 500 });
  }
}

// B21 · PATCH: edita métrica, limiares, fonte e frequência, ou ativa/inativa.
// As medições já gravadas mantêm a faixa da época.
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  const { id } = await props.params;
  try {
    if (!/^\d+$/.test(id ?? "")) return NextResponse.json({ error: "KRI inválido." }, { status: 400 });
    const d = await request.json().catch(() => ({}));
    const sql = sqlAuditado(guarda.usuario);
    const [atual] = await sql`SELECT * FROM kris WHERE id = ${id}`;
    if (!atual) return NextResponse.json({ error: "KRI não encontrado." }, { status: 404 });
    if (typeof d?.ativo === "boolean" && Object.keys(d).length === 1) {
      await sql`UPDATE kris SET ativo = ${d.ativo} WHERE id = ${id}`;
      return NextResponse.json({ ok: true });
    }
    const novo = {
      nome: d.nome ?? atual.nome,
      metrica: d.metrica ?? atual.metrica,
      unidade: d.unidade ?? atual.unidade,
      direcao: d.direcao ?? atual.direcao,
      limiteAmarelo: d.limiteAmarelo ?? Number(atual.limite_amarelo),
      limiteVermelho: d.limiteVermelho ?? Number(atual.limite_vermelho),
      fonte: d.fonte ?? atual.fonte,
      frequencia: d.frequencia ?? atual.frequencia,
      riscoId: atual.risco_id,
    };
    const invalido = validarKri(novo);
    if (invalido) return NextResponse.json({ error: invalido }, { status: 400 });
    await sql`
      UPDATE kris SET nome = ${String(novo.nome).trim()}, metrica = ${String(novo.metrica).trim()},
        unidade = ${String(novo.unidade).trim()}, direcao = ${novo.direcao},
        limite_amarelo = ${numero(novo.limiteAmarelo)}, limite_vermelho = ${numero(novo.limiteVermelho)},
        fonte = ${String(novo.fonte).trim()}, frequencia = ${novo.frequencia}
      WHERE id = ${id}
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao atualizar o KRI." }, { status: 500 });
  }
}
