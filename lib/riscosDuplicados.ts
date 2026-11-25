import { agruparDuplicados, bloqueioComoDuplicado, bloqueioComoPrincipal } from "@/lib/semelhancaRisco";

// B19 · Grupos de riscos repetidos no mesmo projeto, com o que cada risco tem
// (planos, ocorrências, fatores, aceitação) e se pode ser principal ou
// absorvido. Usado pela tela de consolidação e pelo contador do menu.

export async function listarGruposDuplicados(sql: any) {
  const riscos = await sql`
    SELECT r.id, r.projeto_id, p.nome AS projeto, r.titulo, r.gatilho, r.evento, r.causa, r.consequencia,
           r.status, r.impacto_qualitativo AS nivel, r.dono_nome, r.levantado_por,
           to_char(r.data_levantamento, 'YYYY-MM-DD') AS data_levantamento, r.fonte, r.criado_em,
           sc.nome AS ativo,
           (SELECT COUNT(*) FROM planos_acao pa WHERE pa.risco_id = r.id)::int AS planos,
           (SELECT COUNT(*) FROM ocorrencias_risco o WHERE o.risco_id = r.id)::int AS ocorrencias,
           (SELECT COUNT(*) FROM fatores_risco f WHERE f.risco_id = r.id)::int AS fatores,
           (SELECT COUNT(*) FROM aceitacoes_risco a WHERE a.risco_id = r.id)::int AS aceitacoes
    FROM riscos r
    JOIN projetos p ON p.id = r.projeto_id
    LEFT JOIN sistemas_criticos sc ON sc.id = r.sistema_critico_id
  `;
  return agruparDuplicados(riscos as any[]).map((grupo: any[]) => ({
    projeto: grupo[0].projeto,
    titulo: grupo[0].titulo || grupo[0].gatilho,
    riscos: grupo.map((r) => ({
      ...r,
      bloqueioDuplicado: bloqueioComoDuplicado(r),
      bloqueioPrincipal: bloqueioComoPrincipal(r),
    })),
  }));
}
