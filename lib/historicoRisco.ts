// Converte os registros de log_alteracoes (B06) em eventos legíveis para a
// linha do tempo do risco. Módulo puro: sem banco e sem imports, para ser
// usado na tela e nos testes (tests/historicoRisco.test.mts).
//
// Uma alteração gera uma linha de log por campo; aqui as linhas da mesma
// transação, tabela, registro e operação viram um único evento. Campos
// técnicos (índices de mitigação, níveis por eixo etc.) não aparecem na
// linha do tempo, mas continuam no log e no CSV.

export type RegistroLog = {
  id: number | string;
  ocorrido_em: string;
  tabela: string;
  registro_id: string | null;
  operacao: "INSERT" | "UPDATE" | "DELETE";
  campo: string | null;
  valor_anterior: unknown;
  valor_novo: unknown;
  usuario_email: string;
  usuario_nome: string | null;
  origem: "aplicacao" | "banco";
  transacao: number | string;
};

export type TipoEvento = "risco" | "fator" | "plano" | "acao" | "evidencia" | "auditoria";

export type EventoHistorico = {
  data: string;
  tipo: TipoEvento;
  titulo: string;
  autor: string;
  mudancas: { campo: string; de: string; para: string }[];
  /** "tabela:registro" — usado para não repetir eventos de criação. */
  chave: string;
  operacao: RegistroLog["operacao"];
  /** B17: a alteração registrou a revisão periódica (revisado_em). */
  revisao?: boolean;
};

const TIPO_POR_TABELA: Record<string, TipoEvento> = {
  riscos: "risco",
  fatores_risco: "fator",
  planos_acao: "plano",
  acoes: "acao",
  planos_acao_evidencias: "evidencia",
  planos_acao_auditorias: "auditoria",
};

export const ROTULOS_CAMPOS: Record<string, Record<string, string>> = {
  riscos: {
    status: "Status",
    impacto: "Impacto inerente",
    probabilidade: "Probabilidade inerente",
    nivel_inicial: "Nível inerente",
    impacto_qualitativo: "Nível atual",
    nivel_projetado: "Nível projetado",
    categoria: "Categoria",
    gatilho: "Ponto de gatilho",
    resultado_potencial: "Resultado potencial",
    fonte: "Fonte",
    data_levantamento: "Data de levantamento",
    levantado_por: "Levantado por",
    sistema_critico_id: "Sistema crítico",
    mitigado_em: "Mitigado em",
  },
  fatores_risco: {
    descricao: "Descrição",
    criticidade: "Criticidade",
    controle_descricao: "Controle",
    eficacia_potencial: "Eficácia potencial",
    status_implementacao: "Status de implementação",
  },
  planos_acao: {
    titulo: "Título",
    status: "Status",
    auditoria_status: "Auditoria",
    auditoria_comentario: "Comentário da auditoria",
  },
  acoes: {
    descricao: "Descrição",
    responsavel: "Responsável",
    prazo: "Prazo",
    status: "Status",
  },
  planos_acao_evidencias: {},
  planos_acao_auditorias: {},
};

function texto(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "string") {
    // Datas ISO viram dd/mm/aaaa.
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    return v;
  }
  return String(v);
}

function campoDoRegistro(registro: unknown, campo: string): string {
  if (registro && typeof registro === "object" && campo in (registro as Record<string, unknown>)) {
    return texto((registro as Record<string, unknown>)[campo]);
  }
  return "";
}

function titulo(tabela: string, operacao: RegistroLog["operacao"], linha: RegistroLog): string {
  const reg = operacao === "DELETE" ? linha.valor_anterior : linha.valor_novo;
  const nome = (c: string) => campoDoRegistro(reg, c);
  switch (tabela) {
    case "riscos":
      return operacao === "INSERT" ? "Risco cadastrado" : operacao === "DELETE" ? "Risco excluído" : "Risco atualizado";
    case "fatores_risco":
      if (operacao === "INSERT") return `Fator ${nome("codigo")} adicionado`.replace("  ", " ");
      if (operacao === "DELETE") return `Fator ${nome("codigo")} removido`.replace("  ", " ");
      return "Fator de risco atualizado";
    case "planos_acao":
      if (operacao === "INSERT") return `Plano de ação criado: ${nome("titulo")}`;
      if (operacao === "DELETE") return `Plano de ação excluído: ${nome("titulo")}`;
      return "Plano de ação atualizado";
    case "acoes":
      if (operacao === "INSERT") return `Ação registrada: ${nome("descricao")}`;
      if (operacao === "DELETE") return `Ação excluída: ${nome("descricao")}`;
      return "Ação atualizada";
    case "planos_acao_evidencias":
      if (operacao === "INSERT") return `Evidência anexada: ${nome("nome_arquivo")}`;
      if (operacao === "DELETE") return `Evidência removida: ${nome("nome_arquivo")}`;
      return "Evidência atualizada";
    case "planos_acao_auditorias":
      return `Auditoria do plano: ${nome("resultado")}`;
    default:
      return `${tabela}: ${operacao}`;
  }
}

export function montarEventos(registros: RegistroLog[]): EventoHistorico[] {
  const grupos = new Map<string, RegistroLog[]>();
  for (const r of registros) {
    const chave = `${r.transacao}|${r.tabela}|${r.registro_id}|${r.operacao}`;
    const lista = grupos.get(chave) || [];
    lista.push(r);
    grupos.set(chave, lista);
  }

  const eventos: EventoHistorico[] = [];
  for (const linhas of grupos.values()) {
    const primeira = linhas[0];
    const tipo = TIPO_POR_TABELA[primeira.tabela];
    if (!tipo) continue;
    const rotulos = ROTULOS_CAMPOS[primeira.tabela] || {};

    let mudancas: EventoHistorico["mudancas"] = [];
    // Revisão = revisado_em substituído por uma data nova. O preenchimento
    // inicial (de vazio para uma data, feito pela migração 0018) não é revisão.
    const revisao =
      primeira.tabela === "riscos" &&
      linhas.some((l) => l.campo === "revisado_em" && l.valor_anterior !== null && l.valor_anterior !== undefined);
    if (primeira.operacao === "UPDATE") {
      mudancas = linhas
        .filter((l) => l.campo && rotulos[l.campo])
        .map((l) => ({ campo: rotulos[l.campo as string], de: texto(l.valor_anterior), para: texto(l.valor_novo) }));
      // Só campos técnicos mudaram (ex.: recálculo interno): fora da linha do
      // tempo — exceto a revisão periódica, que conta mesmo sem mudanças.
      if (mudancas.length === 0 && !revisao) continue;
    }

    eventos.push({
      data: primeira.ocorrido_em,
      tipo,
      titulo: titulo(primeira.tabela, primeira.operacao, primeira),
      autor:
        primeira.origem === "banco"
          ? `${primeira.usuario_email} (direto no banco)`
          : primeira.usuario_nome || primeira.usuario_email,
      mudancas,
      chave: `${primeira.tabela}:${primeira.registro_id}`,
      operacao: primeira.operacao,
      revisao,
    });
  }

  eventos.sort((a, b) => String(b.data).localeCompare(String(a.data)));
  return juntarAtualizacoesSeguidas(eventos);
}

// Uma edição na tela pode gravar em mais de uma transação (ex.: o PATCH do
// risco e o recálculo do nível atual logo em seguida). Atualizações do mesmo
// registro, pelo mesmo autor, com até JANELA_MS de diferença e que mexem em
// campos DIFERENTES viram um evento. Se o mesmo campo aparece nas duas, são
// edições distintas e ficam separadas.
const JANELA_MS = 5000;

function juntarAtualizacoesSeguidas(eventos: EventoHistorico[]): EventoHistorico[] {
  const resultado: EventoHistorico[] = [];
  for (const e of eventos) {
    const anterior = resultado[resultado.length - 1];
    const camposAnterior = new Set(anterior?.mudancas.map((m) => m.campo) ?? []);
    if (
      anterior &&
      anterior.operacao === "UPDATE" &&
      e.operacao === "UPDATE" &&
      anterior.chave === e.chave &&
      anterior.autor === e.autor &&
      Math.abs(new Date(anterior.data).getTime() - new Date(e.data).getTime()) <= JANELA_MS &&
      e.mudancas.every((m) => !camposAnterior.has(m.campo))
    ) {
      // "anterior" é o mais recente (lista em ordem decrescente): as mudanças
      // mais antigas vêm primeiro.
      anterior.mudancas = [...e.mudancas, ...anterior.mudancas];
      anterior.revisao = anterior.revisao || e.revisao;
      continue;
    }
    resultado.push({ ...e, mudancas: [...e.mudancas] });
  }
  for (const e of resultado) {
    if (e.revisao) e.titulo = e.mudancas.length ? "Risco reavaliado (revisão periódica)" : "Risco revisado sem alterações";
  }
  return resultado;
}
