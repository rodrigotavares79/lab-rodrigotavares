// B28 · Regras dos assessments de segurança. Módulo puro (sem banco, sem
// Clerk, sem imports), usado pelas rotas de /api/assessments, pelas telas e
// pelos testes (tests/assessmentRegras.test.mts). Schema em
// db/migrations/0036_assessments.sql.
//
// - Maturidade por área: Sim = 1, Parcial = 0,5, Não = 0; N/A fica fora da
//   conta. Índice de 0 a 100 sobre as perguntas objetivas aplicáveis.
// - Fluxo: Rascunho -> Em revisão -> Concluído, com devolução a Rascunho.
//   Quem conduz não aprova o próprio assessment (segregação de funções).
// - Uma resposta Não ou Parcial pode virar risco: o sistema sugere os campos,
//   o analista decide se registra.

export const AREAS_ASSESSMENT = [
  "Programa e escopo do time",
  "Governança corporativa",
  "Gestão de riscos",
  "Avaliação de terceiros",
  "Conscientização",
  "Gestão de crises e continuidade",
  "Privacidade de dados",
  "Políticas e normas",
  "Segurança de aplicação",
  "Gestão de acessos e identidades",
  "Internet e perímetro",
  "Segurança ofensiva",
  "Endpoint gerenciado",
  "Proteção da infraestrutura",
  "Monitoramento e incidentes",
  "Threat intelligence",
  "Dados de segurança",
] as const;

/** Categoria do cadastro de riscos sugerida para um risco nascido em cada área. */
export const CATEGORIA_POR_AREA: Record<string, string> = {
  "Programa e escopo do time": "Estratégico",
  "Governança corporativa": "Estratégico",
  "Gestão de riscos": "Estratégico",
  "Avaliação de terceiros": "Operacional",
  "Conscientização": "Segurança da Informação",
  "Gestão de crises e continuidade": "Operacional",
  "Privacidade de dados": "Conformidade / Regulatório",
  "Políticas e normas": "Conformidade / Regulatório",
  "Segurança de aplicação": "Segurança da Informação",
  "Gestão de acessos e identidades": "Segurança da Informação",
  "Internet e perímetro": "Segurança da Informação",
  "Segurança ofensiva": "Segurança da Informação",
  "Endpoint gerenciado": "Tecnológico",
  "Proteção da infraestrutura": "Tecnológico",
  "Monitoramento e incidentes": "Segurança da Informação",
  "Threat intelligence": "Segurança da Informação",
  "Dados de segurança": "Tecnológico",
};

export const TIPOS_ASSESSMENT = ["Ambiente", "Projeto", "Área de negócio"] as const;
export const RESPOSTAS_OBJETIVAS = ["Sim", "Não", "Parcial", "N/A"] as const;
export type RespostaObjetiva = (typeof RESPOSTAS_OBJETIVAS)[number];
export const STATUS_ASSESSMENT = ["Rascunho", "Em revisão", "Concluído"] as const;
export type StatusAssessment = (typeof STATUS_ASSESSMENT)[number];

const PESO: Record<Exclude<RespostaObjetiva, "N/A">, number> = { Sim: 1, Parcial: 0.5, Não: 0 };

export type Pergunta = { id: number; codigo: string; area: string; texto: string; tipo: "objetiva" | "descritiva" };
export type Resposta = { pergunta_id: number; resposta: string | null; descritivo: string | null };

const preenchido = (s: string | null | undefined) => !!s && s.trim().length > 0;

/** A pergunta conta como respondida? Objetiva: tem resposta. Descritiva: tem texto. */
export function respostaCompleta(p: Pergunta, r: Resposta | undefined): boolean {
  if (!r) return false;
  return p.tipo === "objetiva" ? RESPOSTAS_OBJETIVAS.includes(r.resposta as RespostaObjetiva) : preenchido(r.descritivo);
}

export type MaturidadeArea = {
  area: string;
  perguntas: number;
  respondidas: number;
  sim: number;
  parcial: number;
  nao: number;
  na: number;
  descritivas: number;
  descritivasRespondidas: number;
  /** Perguntas objetivas que entram na conta (respondidas e diferentes de N/A). */
  aplicaveis: number;
  /** 0 a 100, uma casa decimal; null sem nenhuma objetiva aplicável. */
  indice: number | null;
};

export type Maturidade = { areas: MaturidadeArea[]; geral: number | null; respondidas: number; perguntas: number };

const umaCasa = (n: number) => Math.round(n * 10) / 10;

/**
 * Maturidade por área e geral. Só entram as áreas escolhidas no assessment,
 * na ordem de AREAS_ASSESSMENT. O índice geral pondera pelas perguntas
 * aplicáveis de cada área (não é média simples das áreas).
 */
export function calcularMaturidade(perguntas: Pergunta[], respostas: Resposta[], areas: readonly string[]): Maturidade {
  const porPergunta = new Map(respostas.map((r) => [r.pergunta_id, r]));
  const escolhidas = new Set(areas);
  const ordem = [...AREAS_ASSESSMENT, ...areas.filter((a) => !(AREAS_ASSESSMENT as readonly string[]).includes(a))];
  let pontosTotal = 0;
  let aplicaveisTotal = 0;
  const lista: MaturidadeArea[] = [];

  for (const area of ordem) {
    if (!escolhidas.has(area)) continue;
    const ps = perguntas.filter((p) => p.area === area);
    const m: MaturidadeArea = { area, perguntas: ps.length, respondidas: 0, sim: 0, parcial: 0, nao: 0, na: 0, descritivas: 0, descritivasRespondidas: 0, aplicaveis: 0, indice: null };
    let pontos = 0;
    for (const p of ps) {
      const r = porPergunta.get(p.id);
      if (respostaCompleta(p, r)) m.respondidas++;
      if (p.tipo === "descritiva") {
        m.descritivas++;
        if (preenchido(r?.descritivo)) m.descritivasRespondidas++;
        continue;
      }
      switch (r?.resposta) {
        case "Sim": m.sim++; break;
        case "Parcial": m.parcial++; break;
        case "Não": m.nao++; break;
        case "N/A": m.na++; continue;
        default: continue;
      }
      m.aplicaveis++;
      pontos += PESO[r!.resposta as Exclude<RespostaObjetiva, "N/A">];
    }
    m.indice = m.aplicaveis ? umaCasa((pontos / m.aplicaveis) * 100) : null;
    pontosTotal += pontos;
    aplicaveisTotal += m.aplicaveis;
    lista.push(m);
  }

  return {
    areas: lista,
    geral: aplicaveisTotal ? umaCasa((pontosTotal / aplicaveisTotal) * 100) : null,
    respondidas: lista.reduce((s, a) => s + a.respondidas, 0),
    perguntas: lista.reduce((s, a) => s + a.perguntas, 0),
  };
}

export type FaixaMaturidade = "Inicial" | "Em desenvolvimento" | "Definido" | "Gerenciado";

/** Faixa de leitura do índice: <40 Inicial, 40–<70 Em desenvolvimento, 70–<90 Definido, ≥90 Gerenciado. */
export function faixaMaturidade(indice: number | null): FaixaMaturidade | null {
  if (indice === null) return null;
  if (indice < 40) return "Inicial";
  if (indice < 70) return "Em desenvolvimento";
  if (indice < 90) return "Definido";
  return "Gerenciado";
}

// ---------------------------------------------------------------- fluxo

export type Ator = { email: string; editarRiscos: boolean; auditar: boolean };
const mesmo = (a: string | null | undefined, b: string | null | undefined) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/** Pode alterar respostas e dados do assessment? Só em Rascunho, com editarRiscos. */
export function podeEditar(status: string, ator: Ator): boolean {
  return status === "Rascunho" && ator.editarRiscos;
}

/**
 * Valida uma mudança de status. Devolve null se pode, ou a mensagem do motivo.
 * - Rascunho -> Em revisão: quem conduz (ou outro com editarRiscos), sem pendências.
 * - Em revisão -> Concluído: quem tem auditar e não é o analista.
 * - Em revisão -> Rascunho (devolver): idem, com motivo obrigatório.
 * - Concluído não muda mais.
 */
export function validarTransicao(t: {
  de: string;
  para: string;
  ator: Ator;
  analistaEmail: string;
  pendentes: number;
  motivo?: string | null;
}): string | null {
  const { de, para, ator } = t;
  if (!STATUS_ASSESSMENT.includes(para as StatusAssessment)) return "Status inválido.";
  if (de === "Concluído") return "Assessment concluído não pode ser alterado.";
  if (de === "Rascunho" && para === "Em revisão") {
    if (!ator.editarRiscos) return "Seu perfil não pode conduzir assessments.";
    if (t.pendentes > 0) return `Ainda há ${t.pendentes} pergunta(s) sem resposta. Responda ou marque N/A antes de enviar para revisão.`;
    return null;
  }
  if (de === "Em revisão" && (para === "Concluído" || para === "Rascunho")) {
    if (!ator.auditar) return "Seu perfil não pode revisar assessments.";
    if (mesmo(ator.email, t.analistaEmail)) return "Quem conduziu o assessment não pode revisá-lo.";
    if (para === "Rascunho" && !preenchido(t.motivo)) return "Informe o motivo da devolução.";
    return null;
  }
  return `Não é possível passar de ${de} para ${para}.`;
}

// ---------------------------------------------------------------- risco

export type SugestaoRisco = { categoria: string; causa: string; evento: string; consequencia: string; gatilho: string };

/**
 * Sugestão de pré-preenchimento do cadastro de risco a partir de uma resposta
 * Não ou Parcial. A causa parte do descritivo (ou da pergunta); evento e
 * consequência ficam para o analista, que conhece o contexto.
 * Devolve null quando a resposta não indica lacuna.
 */
export function sugerirRisco(p: Pergunta, r: Resposta | undefined, codigoAssessment: string): SugestaoRisco | null {
  if (p.tipo !== "objetiva" || (r?.resposta !== "Não" && r?.resposta !== "Parcial")) return null;
  const base = preenchido(r.descritivo)
    ? r.descritivo!.trim()
    : `${r.resposta === "Não" ? "ausência de controle" : "controle implementado parcialmente"}: ${p.texto.replace(/\?\s*$/, "")}`;
  const causa = base.length > 300 ? base.slice(0, 297).trimEnd() + "..." : base;
  return {
    categoria: CATEGORIA_POR_AREA[p.area] ?? "Segurança da Informação",
    causa,
    evento: "",
    consequencia: "",
    gatilho: `Assessment ${codigoAssessment}, pergunta ${p.codigo} (${r.resposta})`,
  };
}

// ---------------------------------------------------------------- cadastro

/** Próximo código livre no formato ASM-001. */
export function proximoCodigo(existentes: string[]): string {
  const max = existentes.reduce((m, c) => {
    const n = /^ASM-(\d+)$/.exec(c)?.[1];
    return n ? Math.max(m, Number(n)) : m;
  }, 0);
  return `ASM-${String(max + 1).padStart(3, "0")}`;
}

export function validarNovoAssessment(d: { titulo?: unknown; tipo?: unknown; projetoId?: unknown; escopo?: unknown; areas?: unknown }): string | null {
  if (typeof d.titulo !== "string" || d.titulo.trim().length < 5) return "Informe um título com pelo menos 5 caracteres.";
  if (!TIPOS_ASSESSMENT.includes(d.tipo as any)) return "Tipo de assessment inválido.";
  if (!Number.isInteger(Number(d.projetoId)) || Number(d.projetoId) <= 0) return "Escolha o projeto.";
  if (typeof d.escopo !== "string" || d.escopo.trim().length < 10) return "Descreva o escopo com pelo menos 10 caracteres.";
  if (!Array.isArray(d.areas) || d.areas.length === 0) return "Escolha pelo menos uma área.";
  const invalida = d.areas.find((a) => !(AREAS_ASSESSMENT as readonly string[]).includes(a));
  if (invalida !== undefined) return `Área desconhecida: ${String(invalida)}.`;
  return null;
}
