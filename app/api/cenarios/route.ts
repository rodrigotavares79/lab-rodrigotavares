import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";
import { sqlAuditado } from "@/lib/sqlAuditado";
import { riscosDosCenarios, resumoDe, validarCenarioCatalogo } from "@/lib/cenariosServidor";
import { proximoCodigoCenario } from "@/lib/resumoCenario";

export const dynamic = "force-dynamic";

// B27 · GET: catálogo de cenários com o resumo de cada um (projetos
// afetados, níveis, tratamento). ?inativos=1 inclui os inativos.
export async function GET(request: NextRequest) {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  try {
    const incluirInativos = request.nextUrl.searchParams.get("inativos") === "1";
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const [cenarios, riscos] = await Promise.all([
      sql`
        SELECT c.id, c.codigo, c.nome, c.evento, c.causa, c.consequencia, c.categoria, c.descricao, c.ativo,
               c.risco_corporativo_id, rc.status AS corporativo_status, rc.impacto_qualitativo AS corporativo_nivel,
               rc.dono_nome AS corporativo_dono
        FROM cenarios_risco c
        LEFT JOIN riscos rc ON rc.id = c.risco_corporativo_id
        WHERE ${incluirInativos} OR c.ativo
        ORDER BY c.codigo
      `,
      riscosDosCenarios(sql),
    ]);
    const porCenario = new Map<number, any[]>();
    for (const r of riscos as any[]) porCenario.set(r.cenario_id, [...(porCenario.get(r.cenario_id) || []), r]);
    return NextResponse.json({
      podeEditar: !!guarda.usuario.permissoes.editarRiscos,
      cenarios: (cenarios as any[]).map((c) => ({ ...c, resumo: resumoDe(porCenario.get(c.id) || []) })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar o catálogo de cenários." }, { status: 500 });
  }
}

// POST: novo cenário no catálogo (quem edita riscos).
export async function POST(request: NextRequest) {
  const guarda = await exigirPermissao("editarRiscos");
  if (guarda.resposta) return guarda.resposta;
  try {
    const v = validarCenarioCatalogo(await request.json().catch(() => ({})));
    if ("erro" in v) return NextResponse.json({ error: v.erro }, { status: 400 });
    const d = v.dados;
    const sql = sqlAuditado(guarda.usuario);
    const codigos = (await sql`SELECT codigo FROM cenarios_risco`).map((r: any) => r.codigo);
    const [novo] = await sql`
      INSERT INTO cenarios_risco (codigo, nome, evento, causa, consequencia, categoria, descricao, criado_por_email)
      VALUES (${proximoCodigoCenario(codigos)}, ${d.nome}, ${d.evento}, ${d.causa}, ${d.consequencia},
              ${d.categoria}, ${d.descricao}, ${guarda.usuario.email})
      RETURNING id, codigo
    `;
    return NextResponse.json(novo, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao cadastrar o cenário." }, { status: 500 });
  }
}
