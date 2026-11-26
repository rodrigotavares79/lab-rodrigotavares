import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { numero, proximoCodigoKri, validarKri } from "@/lib/kriRisco";
import { listarKris } from "@/lib/kriServidor";

export const dynamic = "force-dynamic";

// B21 · GET ?riscoId: KRIs com a última medição e o histórico recente.
export async function GET(request: NextRequest) {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  try {
    const p = request.nextUrl.searchParams.get("riscoId");
    const riscoId = p && /^\d+$/.test(p) ? Number(p) : null;
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const kris = await listarKris(sql, { riscoId });
    return NextResponse.json({ kris, podeEditar: guarda.usuario.permissoes.editarRiscos });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar os KRIs." }, { status: 500 });
  }
}

// B21 · POST: cadastra um KRI ligado a um risco.
export async function POST(request: NextRequest) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  try {
    const d = await request.json().catch(() => ({}));
    const invalido = validarKri(d ?? {});
    if (invalido) return NextResponse.json({ error: invalido }, { status: 400 });
    const sql = sqlAuditado(guarda.usuario);
    const [risco] = await sql`SELECT id, status FROM riscos WHERE id = ${Number(d.riscoId)}`;
    if (!risco) return NextResponse.json({ error: "Risco não encontrado." }, { status: 404 });
    const codigos = await sql`SELECT codigo FROM kris`;
    const codigo = proximoCodigoKri(codigos.map((c: any) => c.codigo));
    const [kri] = await sql`
      INSERT INTO kris (codigo, nome, metrica, unidade, direcao, limite_amarelo, limite_vermelho, fonte, frequencia,
                        risco_id, responsavel_email, responsavel_nome, criado_por_email)
      VALUES (${codigo}, ${String(d.nome).trim().slice(0, 200)}, ${String(d.metrica).trim().slice(0, 1000)},
              ${String(d.unidade).trim().slice(0, 40)}, ${d.direcao}, ${numero(d.limiteAmarelo)}, ${numero(d.limiteVermelho)},
              ${String(d.fonte).trim().slice(0, 200)}, ${d.frequencia}, ${risco.id},
              ${guarda.usuario.email}, ${guarda.usuario.nome}, ${guarda.usuario.email})
      RETURNING id, codigo
    `;
    return NextResponse.json({ kri }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao cadastrar o KRI." }, { status: 500 });
  }
}
