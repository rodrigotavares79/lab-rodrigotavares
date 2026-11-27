// B29 · Regras do cadastro de projetos e das solicitações de inclusão. Módulo
// puro (sem banco), usado pelas rotas de /api/projetos, pelas telas e pelos
// testes (tests/projetosRegras.test.mts).

export const TAMANHO_MAXIMO_NOME_PROJETO = 120;

/** Tira espaços repetidos e das pontas. */
export function normalizarNomeProjeto(nome: unknown): string {
  return typeof nome === "string" ? nome.trim().replace(/\s+/g, " ") : "";
}

/** Chave de comparação: sem diferenciar maiúsculas, acentos e espaços. */
export function chaveNomeProjeto(nome: string): string {
  return normalizarNomeProjeto(nome).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function validarNomeProjeto(nome: unknown): string | null {
  const n = normalizarNomeProjeto(nome);
  if (n.length < 3) return "Informe o nome do projeto com pelo menos 3 caracteres.";
  if (n.length > TAMANHO_MAXIMO_NOME_PROJETO) return `Use no máximo ${TAMANHO_MAXIMO_NOME_PROJETO} caracteres no nome.`;
  return null;
}

/** Projeto já cadastrado com nome equivalente (ignora o próprio id, na edição). */
export function projetoComMesmoNome<T extends { id: number; nome: string }>(nome: string, existentes: T[], ignorarId?: number): T | undefined {
  const chave = chaveNomeProjeto(nome);
  return existentes.find((p) => p.id !== ignorarId && chaveNomeProjeto(p.nome) === chave);
}

export function validarSolicitacao(d: { nome?: unknown; justificativa?: unknown }): string | null {
  const erroNome = validarNomeProjeto(d.nome);
  if (erroNome) return erroNome;
  const j = typeof d.justificativa === "string" ? d.justificativa.trim() : "";
  if (j.length < 10) return "Explique em pelo menos 10 caracteres para que o projeto é necessário.";
  return null;
}

export type DecisaoSolicitacao = { decisao: "Aprovada"; nome: string; projetoExistenteId?: number } | { decisao: "Recusada"; motivo: string };

/**
 * Valida a decisão sobre uma solicitação. Aprovar cria o projeto com o nome
 * informado (pode ser ajustado) ou aponta um projeto que já existe. Recusar
 * exige motivo. Quem pediu não decide a própria solicitação.
 */
export function validarDecisao(d: { decisao?: unknown; nome?: unknown; motivo?: unknown; projetoExistenteId?: unknown }, ctx: { situacao: string; solicitante: string; decisor: string }): string | null {
  if (ctx.situacao !== "Pendente") return "Esta solicitação já foi decidida.";
  if (ctx.solicitante.trim().toLowerCase() === ctx.decisor.trim().toLowerCase()) return "Quem pediu a inclusão não pode decidir a própria solicitação.";
  if (d.decisao === "Recusada") {
    return typeof d.motivo === "string" && d.motivo.trim().length >= 5 ? null : "Informe o motivo da recusa.";
  }
  if (d.decisao === "Aprovada") {
    if (d.projetoExistenteId !== undefined && d.projetoExistenteId !== null && d.projetoExistenteId !== "") {
      return Number.isInteger(Number(d.projetoExistenteId)) && Number(d.projetoExistenteId) > 0 ? null : "Projeto existente inválido.";
    }
    return validarNomeProjeto(d.nome);
  }
  return "Decisão inválida.";
}
