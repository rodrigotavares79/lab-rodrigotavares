import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { exigirPermissao } from "@/lib/riscosAuth";
import { CATALOGO_CONTROLES, temasDoTexto } from "@/lib/catalogoControles";
import { chave, cobertura, sugestoes } from "@/lib/mapeamentoControles";

export const dynamic = "force-dynamic";

// B24 · GET: para cada risco ativo, os controles confirmados (com status) e as
// sugestões a confirmar (biblioteca do cenário e palavra-chave), mais a
// cobertura por framework e o catálogo de controles para inclusão manual.
export async function GET() {
  const guarda = await exigirPermissao("ler");
  if (guarda.resposta) return guarda.resposta;
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: "no-store" } });
    const [riscos, decisoes, biblioteca] = await Promise.all([
      sql`
        SELECT
          r.id, r.categoria, r.gatilho, r.titulo, r.causa, r.evento, r.consequencia, r.resultado_potencial,
          r.impacto_qualitativo, r.status, r.cenario_id, c.codigo AS cenario_codigo,
          p.id AS projeto_id, p.nome AS projeto,
          COALESCE((SELECT STRING_AGG(CONCAT_WS(' ', f.descricao, f.explicacao, f.controle_descricao), ' ')
                    FROM fatores_risco f WHERE f.risco_id = r.id), '') AS texto_fatores
        FROM riscos r
        LEFT JOIN projetos p ON p.id = r.projeto_id
        LEFT JOIN cenarios_risco c ON c.id = r.cenario_id
        WHERE r.status <> 'Mitigado'
        ORDER BY r.id DESC
      `,
      sql`
        SELECT risco_id, framework, controle_id, controle_titulo, situacao, status, fonte, observacao,
               decidido_por_nome, decidido_em
        FROM riscos_controles
      `,
      sql`
        SELECT cc.cenario_id, cc.framework, cc.controle_id, c.codigo AS cenario
        FROM cenario_controles cc JOIN cenarios_risco c ON c.id = cc.cenario_id
      `,
    ]);

    const porRisco = new Map<number, any[]>();
    for (const d of decisoes as any[]) {
      const l = porRisco.get(d.risco_id) ?? [];
      l.push(d);
      porRisco.set(d.risco_id, l);
    }
    const bibPorCenario = new Map<number, any[]>();
    for (const b of biblioteca as any[]) {
      const l = bibPorCenario.get(b.cenario_id) ?? [];
      l.push(b);
      bibPorCenario.set(b.cenario_id, l);
    }

    const itens = (riscos as any[]).map((r) => {
      const dec = porRisco.get(r.id) ?? [];
      const decididos = new Set(dec.map((d) => chave(d.framework, d.controle_id)));
      const texto = [r.causa, r.evento, r.consequencia, r.gatilho, r.resultado_potencial, r.categoria, r.texto_fatores]
        .filter(Boolean)
        .join(". ");
      return {
        id: r.id,
        gatilho: r.gatilho,
        titulo: r.titulo,
        categoria: r.categoria,
        nivel: r.impacto_qualitativo,
        status: r.status,
        projeto_id: r.projeto_id,
        projeto: r.projeto,
        cenario: r.cenario_codigo,
        confirmados: dec.filter((d) => d.situacao === "confirmado"),
        descartados: dec.filter((d) => d.situacao === "descartado").length,
        sugestoes: sugestoes(CATALOGO_CONTROLES, temasDoTexto(texto), r.cenario_id ? bibPorCenario.get(r.cenario_id) ?? [] : [], decididos),
      };
    });

    const confirmadosAtivos = itens.flatMap((i) => i.confirmados);
    return NextResponse.json({
      riscos: itens,
      cobertura: cobertura(confirmadosAtivos),
      catalogo: CATALOGO_CONTROLES,
      podeEditar: guarda.usuario.permissoes.editarRiscos,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao gerar o mapeamento de conformidade." }, { status: 500 });
  }
}
