import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";
import { mapearRisco } from "@/lib/conformidadeFrameworks";

export const dynamic = "force-dynamic";

// GET: mapeamento automático de todos os riscos para CIS Controls v8.1,
// NIST CSF 2.0 e ISO/IEC 27001:2022. Somente leitura, para qualquer perfil.
export async function GET() {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  try {
    const usuario = guarda.usuario;

    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const riscos = await sql`
      SELECT
        r.id, r.categoria, r.gatilho, r.resultado_potencial, r.impacto_qualitativo, r.status,
        p.id AS projeto_id, p.nome AS projeto,
        COALESCE(STRING_AGG(CONCAT_WS(' ', f.descricao, f.explicacao, f.controle_descricao), ' ') , '') AS texto_fatores
      FROM riscos r
      LEFT JOIN projetos p ON p.id = r.projeto_id
      LEFT JOIN fatores_risco f ON f.risco_id = r.id
      GROUP BY r.id, p.id
      ORDER BY r.id DESC
    `;

    const itens = riscos.map((r: any) => {
      const m = mapearRisco([r.gatilho, r.resultado_potencial, r.categoria, r.texto_fatores].filter(Boolean).join(". "));
      return {
        id: r.id,
        gatilho: r.gatilho,
        categoria: r.categoria,
        nivel: r.impacto_qualitativo,
        status: r.status,
        projeto_id: r.projeto_id,
        projeto: r.projeto,
        generico: m.generico,
        temas: m.temas.map((t) => ({ id: t.tema.id, nome: t.tema.nome, termos: t.termos })),
        cis: m.cis,
        nist: m.nist,
        iso: m.iso,
      };
    });

    return NextResponse.json({ riscos: itens });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao gerar o mapeamento de conformidade." }, { status: 500 });
  }
}
