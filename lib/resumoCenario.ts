// B27 · Visão por cenário: quantos projetos o cenário afeta, a distribuição
// por nível e a situação do tratamento dos riscos ligados a ele.
//
// Sem imports: o módulo roda direto no `node --test`.

export const NIVEIS = ["Crítico", "Alto", "Médio", "Baixo"] as const;
// A partir de quantos projetos afetados o cenário é sinalizado como candidato
// a tratamento central (risco corporativo).
export const PROJETOS_PARA_TRATAMENTO_CENTRAL = 3;

export type RiscoDoCenario = {
  projeto_id: number;
  nivel: string | null;
  status: string | null;
  planos: number;
  aceito: boolean;
  corporativo?: boolean;
};

export type ResumoCenario = {
  projetos: number;
  riscos: number;
  porNivel: Record<string, number>;
  altosOuCriticos: number;
  comPlano: number;
  aceitos: number;
  mitigados: number;
  // Mesma definição do B02: Alto ou Crítico, não mitigado, sem plano e sem
  // aceitação vigente.
  semTratamento: number;
  // Baixo/Médio (ou sem nível) sem plano nem aceitação: não entram no
  // indicador "sem tratamento", mas aparecem para quem acompanha o cenário.
  outrosSemPlano: number;
  candidatoCorporativo: boolean;
};

export function resumirCenario(riscos: RiscoDoCenario[]): ResumoCenario {
  const deProjeto = riscos.filter((r) => !r.corporativo);
  const porNivel: Record<string, number> = { Crítico: 0, Alto: 0, Médio: 0, Baixo: 0 };
  let comPlano = 0;
  let aceitos = 0;
  let mitigados = 0;
  let semTratamento = 0;
  let outrosSemPlano = 0;
  for (const r of deProjeto) {
    if (r.nivel && r.nivel in porNivel) porNivel[r.nivel]++;
    if (r.status === "Mitigado") mitigados++;
    else if (r.aceito) aceitos++;
    else if (r.planos > 0) comPlano++;
    else if (r.nivel === "Alto" || r.nivel === "Crítico") semTratamento++;
    else outrosSemPlano++;
  }
  const projetos = new Set(deProjeto.map((r) => r.projeto_id)).size;
  return {
    projetos,
    riscos: deProjeto.length,
    porNivel,
    altosOuCriticos: porNivel["Crítico"] + porNivel["Alto"],
    comPlano,
    aceitos,
    mitigados,
    semTratamento,
    outrosSemPlano,
    candidatoCorporativo: projetos >= PROJETOS_PARA_TRATAMENTO_CENTRAL,
  };
}

// Próximo código do catálogo: CEN-001, CEN-002... a partir dos existentes.
export function proximoCodigoCenario(codigos: string[]): string {
  const max = codigos.reduce((m, c) => {
    const n = Number(/^CEN-(\d+)$/.exec(c)?.[1] ?? 0);
    return n > m ? n : m;
  }, 0);
  return `CEN-${String(max + 1).padStart(3, "0")}`;
}

export const NOME_PROJETO_CORPORATIVO = "Corporativo (transversal)";
