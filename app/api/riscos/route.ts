import { exigirPermissao } from "@/lib/riscosAuth";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { situacaoDoRisco } from "@/lib/apetiteRisco";
import { limitesVigentes } from "@/lib/apetiteServidor";

export async function GET(request: NextRequest) {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  try {
    const projetoId = request.nextUrl.searchParams.get("projetoId");
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });

    const rows = projetoId
      ? await sql`
          SELECT
            r.id, p.nome AS projeto, r.categoria, r.gatilho, r.titulo, r.levantado_por,
            r.data_levantamento, r.impacto_qualitativo, r.matrix_score,
            r.status, r.criado_em, r.sem_controles,
            (SELECT COUNT(*) FROM fatores_risco f WHERE f.risco_id = r.id)::int AS fatores,
            r.dono_email, r.dono_nome, r.dono_contato_id, r.ponto_focal_nome,
            sc.nome AS ativo, sc.tipo AS ativo_tipo, sc.area_responsavel AS area
          FROM riscos r
          JOIN projetos p ON p.id = r.projeto_id
          LEFT JOIN sistemas_criticos sc ON sc.id = r.sistema_critico_id
          WHERE r.projeto_id = ${projetoId}
          ORDER BY r.criado_em DESC
        `
      : await sql`
          SELECT
            r.id, p.nome AS projeto, r.categoria, r.gatilho, r.titulo, r.levantado_por,
            r.data_levantamento, r.impacto_qualitativo, r.matrix_score,
            r.status, r.criado_em, r.sem_controles,
            (SELECT COUNT(*) FROM fatores_risco f WHERE f.risco_id = r.id)::int AS fatores,
            r.dono_email, r.dono_nome, r.dono_contato_id, r.ponto_focal_nome,
            sc.nome AS ativo, sc.tipo AS ativo_tipo, sc.area_responsavel AS area
          FROM riscos r
          JOIN projetos p ON p.id = r.projeto_id
          LEFT JOIN sistemas_criticos sc ON sc.id = r.sistema_critico_id
          ORDER BY r.criado_em DESC
        `;

    // B18: situação de cada risco frente ao apetite/tolerância vigentes.
    const vig = await limitesVigentes(sql);
    const riscos = rows.map((r: any) => ({ ...r, apetite: situacaoDoRisco(r, vig.mapa) }));
    return NextResponse.json({ riscos, apetiteVersao: vig.versao });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar riscos." }, { status: 500 });
  }
}
