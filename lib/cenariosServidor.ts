import { resumirCenario, NOME_PROJETO_CORPORATIVO } from "@/lib/resumoCenario";
import { validarCenario } from "@/lib/cenarioRisco";

// B27 · Consultas do catálogo de cenários (lado do servidor).

export async function riscosDosCenarios(sql: any, cenarioId: number | null = null) {
  return sql`
    SELECT r.id, r.cenario_id, r.projeto_id, p.nome AS projeto, r.titulo, r.impacto_qualitativo AS nivel, r.status,
           r.dono_nome, p.nome = ${NOME_PROJETO_CORPORATIVO} AS corporativo,
           (SELECT COUNT(*) FROM planos_acao pa WHERE pa.risco_id = r.id)::int AS planos,
           EXISTS (
             SELECT 1 FROM aceitacoes_risco a
             WHERE a.risco_id = r.id AND a.situacao = 'Aprovada'
               AND a.valido_ate >= (now() AT TIME ZONE 'America/Sao_Paulo')::date
           ) AS aceito
    FROM riscos r
    JOIN projetos p ON p.id = r.projeto_id
    WHERE r.cenario_id IS NOT NULL AND (${cenarioId}::int IS NULL OR r.cenario_id = ${cenarioId})
    ORDER BY p.nome, r.id
  `;
}

export function resumoDe(riscos: any[]) {
  return resumirCenario(riscos.map((r) => ({ ...r, corporativo: !!r.corporativo })));
}

export type DadosCenarioCatalogo = {
  nome: string;
  evento: string;
  causa: string;
  consequencia: string;
  categoria: string | null;
  descricao: string | null;
};

const limpo = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");

export function validarCenarioCatalogo(b: any): { erro: string } | { dados: DadosCenarioCatalogo } {
  const dados = {
    nome: limpo(b?.nome, 150),
    evento: limpo(b?.evento, 300),
    causa: limpo(b?.causa, 300),
    consequencia: limpo(b?.consequencia, 300),
    categoria: limpo(b?.categoria, 80) || null,
    descricao: limpo(b?.descricao, 2000) || null,
  };
  if (dados.nome.length < 3) return { erro: "Informe o nome do cenário (pelo menos 3 caracteres)." };
  const e = validarCenario(dados);
  if (e) return { erro: e };
  return { dados };
}
