import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";
import { armazenamentoEvidenciasConfigurado, lerEvidencia } from "@/lib/riscosEvidencias";

export const dynamic = "force-dynamic";

// B16 · GET: entrega a Carta de Risco de uma aceitação (store privado; só por
// esta rota, que confere a permissão a cada acesso).
export async function GET(_request: NextRequest, props: { params: Promise<{ id: string; aceitacaoId: string }> }) {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  const { id, aceitacaoId } = await props.params;
  try {
    if (!/^\d+$/.test(id ?? "") || !/^\d+$/.test(aceitacaoId ?? "")) {
      return NextResponse.json({ error: "Carta inválida." }, { status: 400 });
    }
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const [a] = await sql`
      SELECT carta_url, carta_nome, carta_tipo, carta_sha256
      FROM aceitacoes_risco WHERE id = ${aceitacaoId} AND risco_id = ${id}
    `;
    if (!a) return NextResponse.json({ error: "Carta não encontrada." }, { status: 404 });
    if (!armazenamentoEvidenciasConfigurado()) {
      return NextResponse.json({ error: "Armazenamento não configurado." }, { status: 503 });
    }
    const resultado = await lerEvidencia(a.carta_url);
    if (!resultado || resultado.statusCode !== 200) {
      return NextResponse.json({ error: "Arquivo da carta não encontrado." }, { status: 404 });
    }
    const nome = String(a.carta_nome).replace(/["\r\n]/g, "");
    return new NextResponse(resultado.stream, {
      status: 200,
      headers: {
        "Content-Type": a.carta_tipo,
        "Content-Disposition": `${a.carta_tipo === "application/pdf" ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(nome)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Evidencia-SHA256": a.carta_sha256,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao abrir a carta." }, { status: 500 });
  }
}
