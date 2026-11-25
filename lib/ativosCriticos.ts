// B14 · Inventário de ativos e processos críticos e dono do risco.
//
// O inventário é a tabela sistemas_criticos ampliada (tipo, área, situação).
// Só ativos com os dois custos preenchidos entram no cálculo financeiro do
// risco. Sem imports: o módulo roda direto no `node --test`.

export const TIPOS_ATIVO = ["Sistema", "Processo", "Infraestrutura", "Dados", "Fornecedor"] as const;
export type TipoAtivo = (typeof TIPOS_ATIVO)[number];

export function tipoAtivoValido(v: unknown): v is TipoAtivo {
  return typeof v === "string" && (TIPOS_ATIVO as readonly string[]).includes(v);
}

export type DadosAtivo = {
  nome?: unknown;
  tipo?: unknown;
  areaResponsavel?: unknown;
  descricao?: unknown;
  custoIndisponibilidadeHora?: unknown;
  custoRestauracaoHoraHomem?: unknown;
};

export type AtivoNormalizado = {
  nome: string;
  tipo: TipoAtivo;
  areaResponsavel: string;
  descricao: string | null;
  custoIndisponibilidadeHora: number | null;
  custoRestauracaoHoraHomem: number | null;
};

function textoLimpo(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

// Aceita número ou texto no formato brasileiro ("1.234,56"). Vazio = null.
export function custoOuNull(v: unknown): number | null | "invalido" {
  if (v === null || v === undefined || v === "") return null;
  let n: number;
  if (typeof v === "number") n = v;
  else if (typeof v === "string") {
    const t = v.trim();
    if (!t) return null;
    n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  } else return "invalido";
  if (!Number.isFinite(n) || n < 0) return "invalido";
  return n;
}

// Valida e normaliza os dados de um ativo. Devolve { erro } ou { ativo }.
export function validarAtivo(d: DadosAtivo): { erro: string } | { ativo: AtivoNormalizado } {
  const nome = textoLimpo(d.nome, 150);
  if (nome.length < 3) return { erro: "Informe o nome do ativo ou processo (pelo menos 3 caracteres)." };
  if (!tipoAtivoValido(d.tipo)) return { erro: `Tipo inválido. Use um de: ${TIPOS_ATIVO.join(", ")}.` };
  const areaResponsavel = textoLimpo(d.areaResponsavel, 120);
  if (areaResponsavel.length < 2) return { erro: "Informe a área responsável pelo ativo ou processo." };
  const indisp = custoOuNull(d.custoIndisponibilidadeHora);
  const restaur = custoOuNull(d.custoRestauracaoHoraHomem);
  if (indisp === "invalido" || restaur === "invalido") return { erro: "Os custos devem ser números maiores ou iguais a zero." };
  if ((indisp === null) !== (restaur === null)) {
    return { erro: "Preencha os dois custos (indisponibilidade e restauração) ou nenhum." };
  }
  const descricao = textoLimpo(d.descricao, 2000) || null;
  return {
    ativo: { nome, tipo: d.tipo, areaResponsavel, descricao, custoIndisponibilidadeHora: indisp, custoRestauracaoHoraHomem: restaur },
  };
}

// Ativo com os dois custos entra no cálculo financeiro.
export function ativoTemCusto(a: {
  custo_indisponibilidade_hora?: unknown;
  custo_restauracao_hora_homem?: unknown;
}): boolean {
  return (
    a.custo_indisponibilidade_hora !== null &&
    a.custo_indisponibilidade_hora !== undefined &&
    a.custo_restauracao_hora_homem !== null &&
    a.custo_restauracao_hora_homem !== undefined
  );
}

// O ativo de um risco pode ser definido ou trocado enquanto o risco não tem
// estimativa financeira (que foi calculada com os custos do ativo anterior).
export function podeTrocarAtivo(r: { impacto_critico_total?: unknown; impacto_alto_total?: unknown }): boolean {
  const tem = (v: unknown) => v !== null && v !== undefined && Number(v) > 0;
  return !tem(r.impacto_critico_total) && !tem(r.impacto_alto_total);
}

export const MSG_SEM_DONO = "Escolha o dono do risco: o usuário que responde pelo risco e decide o tratamento.";
