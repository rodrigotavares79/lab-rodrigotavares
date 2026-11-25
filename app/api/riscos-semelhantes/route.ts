import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sugerirSemelhantes } from "@/lib/semelhancaRisco";

export const dynamic = "force-dynamic";

// B19 · POST { projetoId, evento?, causa?, consequencia? } — riscos do mesmo
// projeto com cenário parecido com o que está sendo cadastrado (até 5).
// POST porque o corpo leva texto livre.
export async function POST(request: NextRequest) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  try {
    const body = await request.json().catch(() => ({}));
    const projetoId = Number(body?.projetoId);
    if (!Number.isInteger(projetoId) || projetoId <= 0) return NextResponse.json({ semelhantes: [] });
    const texto = (v: unknown) => (typeof v === "string" ? v.slice(0, 300) : "");
    const digitado = { evento: texto(body.evento), causa: texto(body.causa), consequencia: texto(body.consequencia) };

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const candidatos = await sql`
      SELECT r.id, r.titulo, r.gatilho, r.evento, r.causa, r.consequencia, r.status, r.impacto_qualitativo,
             r.dono_nome,
             (SELECT COUNT(*) FROM ocorrencias_risco o WHERE o.risco_id = r.id)::int AS ocorrencias
      FROM riscos r
      WHERE r.projeto_id = ${projetoId}
    `;
    const semelhantes = sugerirSemelhantes(digitado, candidatos as any[]).map(
      ({ id, titulo, gatilho, status, impacto_qualitativo, dono_nome, ocorrencias, nota }: any) => ({
        id,
        titulo: titulo || gatilho,
        status,
        nivel: impacto_qualitativo,
        dono: dono_nome,
        ocorrencias,
        nota,
      })
    );
    return NextResponse.json({ semelhantes });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar riscos semelhantes." }, { status: 500 });
  }
}
