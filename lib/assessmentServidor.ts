// B28 · Consultas dos assessments (lado do servidor). As regras puras ficam em
// lib/assessmentRegras.ts; aqui só leitura do banco e montagem do retrato.

import { calcularMaturidade, respostaCompleta, type Pergunta, type Resposta } from "@/lib/assessmentRegras";

type Sql = (strings: TemplateStringsArray, ...valores: any[]) => Promise<any[]>;

export type RespostaCompleta = Resposta & { evidencia: string | null; entrevistados: string | null; respondido_por_nome: string | null; atualizado_em: string };

export type RiscoVinculado = {
  pergunta_id: number;
  risco_id: number;
  titulo: string | null;
  gatilho: string | null;
  status: string | null;
  impacto_qualitativo: string | null;
  matrix_score: number | null;
};

/**
 * Perguntas que valem para o assessment: as ativas das áreas escolhidas, mais
 * qualquer pergunta já respondida nele (mesmo que desativada depois), para o
 * histórico não perder linhas.
 */
export async function perguntasDoAssessment(sql: Sql, assessmentId: number, areas: string[]): Promise<Pergunta[]> {
  const linhas = await sql`
    SELECT p.id, p.codigo, p.area, p.texto, p.tipo
    FROM assessment_perguntas p
    WHERE (p.ativa AND p.area = ANY(${areas}))
       OR p.id IN (SELECT pergunta_id FROM assessment_respostas WHERE assessment_id = ${assessmentId})
    ORDER BY p.area_ordem, p.ordem
  `;
  return linhas as Pergunta[];
}

export async function carregarAssessment(sql: Sql, id: number) {
  const [a] = await sql`
    SELECT a.*, p.nome AS projeto,
           to_char(a.data_inicio, 'YYYY-MM-DD') AS data_inicio
    FROM assessments a JOIN projetos p ON p.id = a.projeto_id
    WHERE a.id = ${id}
  `;
  if (!a) return null;
  const perguntas = await perguntasDoAssessment(sql, id, a.areas);
  const respostas = (await sql`
    SELECT pergunta_id, resposta, descritivo, evidencia, entrevistados, respondido_por_nome, atualizado_em
    FROM assessment_respostas WHERE assessment_id = ${id}
  `) as RespostaCompleta[];
  const riscos = (await sql`
    SELECT ar.pergunta_id, r.id AS risco_id, r.titulo, r.gatilho, r.status, r.impacto_qualitativo, r.matrix_score
    FROM assessment_riscos ar JOIN riscos r ON r.id = ar.risco_id
    WHERE ar.assessment_id = ${id}
    ORDER BY ar.vinculado_em
  `) as RiscoVinculado[];
  const porPergunta = new Map(respostas.map((r) => [r.pergunta_id, r]));
  const pendentes = perguntas.filter((p) => a.areas.includes(p.area) && !respostaCompleta(p, porPergunta.get(p.id))).length;
  const maturidade = calcularMaturidade(perguntas, respostas, a.areas);
  return { assessment: a, perguntas, respostas, riscos, pendentes, maturidade };
}

/** Foto gravada na conclusão: o relatório de um assessment concluído lê daqui. */
export function montarSnapshot(dados: NonNullable<Awaited<ReturnType<typeof carregarAssessment>>>, revisor: { email: string; nome: string }) {
  return {
    versao: 1,
    gerado_em: new Date().toISOString(),
    revisor,
    perguntas: dados.perguntas,
    respostas: dados.respostas,
    riscos: dados.riscos,
    maturidade: dados.maturidade,
  };
}

/**
 * Confere se uma pergunta de um assessment pode dar origem a um risco:
 * assessment em Rascunho, pergunta objetiva dentro das áreas e resposta
 * gravada Não ou Parcial. Usado pela sugestão e pelo cadastro do risco.
 */
export async function origemRiscoAssessment(sql: Sql, assessmentId: unknown, perguntaId: unknown) {
  const aId = Number(assessmentId);
  const pId = Number(perguntaId);
  if (!Number.isInteger(aId) || aId <= 0 || !Number.isInteger(pId) || pId <= 0) return { erro: "Origem do assessment inválida." } as const;
  const [linha] = await sql`
    SELECT a.id AS assessment_id, a.codigo AS assessment_codigo, a.status, a.areas, a.projeto_id,
           p.id AS pergunta_id, p.codigo, p.area, p.texto, p.tipo,
           r.resposta, r.descritivo, r.evidencia
    FROM assessments a
    JOIN assessment_perguntas p ON p.id = ${pId}
    LEFT JOIN assessment_respostas r ON r.assessment_id = a.id AND r.pergunta_id = p.id
    WHERE a.id = ${aId}
  `;
  if (!linha) return { erro: "Assessment ou pergunta não encontrados." } as const;
  if (linha.status !== "Rascunho") return { erro: "Riscos só podem ser registrados enquanto o assessment está em Rascunho." } as const;
  if (!linha.areas.includes(linha.area) || linha.tipo !== "objetiva") return { erro: "Pergunta fora do escopo do assessment." } as const;
  if (linha.resposta !== "Não" && linha.resposta !== "Parcial") return { erro: "Só respostas Não ou Parcial dão origem a risco. Grave a resposta antes." } as const;
  return { origem: linha } as const;
}
