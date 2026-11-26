// B26 · Recomendações priorizadas do Relatório Executivo. Módulo puro (sem
// banco, sem imports), testado em tests/recomendacoesRisco.test.mts.
//
// Cada regra olha um fato do portfólio e, se ele pede ação, gera uma
// recomendação com prioridade (1 = agir já, 2 = neste ciclo, 3 = acompanhar),
// o porquê e os riscos envolvidos. A ordem é: prioridade, depois a ordem das
// regras abaixo (da mais grave para a menos grave).

export type Prioridade = 1 | 2 | 3;

export const ROTULO_PRIORIDADE: Record<Prioridade, string> = {
  1: "Agir já",
  2: "Neste ciclo",
  3: "Acompanhar",
};

export type Recomendacao = {
  prioridade: Prioridade;
  titulo: string;
  porque: string;
  riscos: number[];
};

export type FatosPortfolio = {
  /** Riscos ativos acima da tolerância da categoria. */
  acimaTolerancia: { id: number; nivel: string | null; temPlanoAberto: boolean; aceito: boolean }[];
  /** Riscos ativos acima do apetite, mas dentro da tolerância. */
  acimaApetite: number;
  /** KRIs ativos cuja medição mais recente está no vermelho. */
  krisVermelho: { codigo: string; riscoId: number }[];
  /** KRIs ativos sem medição ou com medição atrasada. */
  krisSemMedicao: number;
  /** Alto/Crítico sem plano nem aceitação (B02). */
  semTratamento: number[];
  acoesAtrasadas: { total: number; riscos: number[] };
  revisoesVencidas: number;
  planosAguardandoAuditoria: number;
  aceitacoesPendentes: number;
  aceitacoesVencendo: number[];
  apetitePendente: number | null;
  semDono: number;
  controlesNaoAvaliados: number;
  /** Alto/Crítico atual hoje e três meses antes (fotos mensais), se houver. */
  altoCriticoAgora: number | null;
  altoCriticoTresMesesAntes: number | null;
};

function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`;
}

const unicos = (ids: number[]) => [...new Set(ids)].sort((a, b) => a - b);

export function recomendacoes(f: FatosPortfolio, limite = 8): Recomendacao[] {
  const out: Recomendacao[] = [];

  const tolSemPlano = f.acimaTolerancia.filter((r) => !r.temPlanoAberto && !r.aceito);
  if (tolSemPlano.length) {
    out.push({
      prioridade: 1,
      titulo: `Definir tratamento para ${plural(tolSemPlano.length, "risco acima da tolerância", "riscos acima da tolerância")}`,
      porque: "Estão além do que a organização suporta e não têm plano de ação aberto nem aceitação formal.",
      riscos: unicos(tolSemPlano.map((r) => r.id)),
    });
  }

  if (f.krisVermelho.length) {
    out.push({
      prioridade: 1,
      titulo: `Reavaliar ${plural(unicos(f.krisVermelho.map((k) => k.riscoId)).length, "risco com indicador", "riscos com indicadores")} no vermelho`,
      porque: `${f.krisVermelho.map((k) => k.codigo).join(", ")} ultrapassaram o limiar vermelho: o risco pode estar se materializando.`,
      riscos: unicos(f.krisVermelho.map((k) => k.riscoId)),
    });
  }

  const tolComPlano = f.acimaTolerancia.filter((r) => r.temPlanoAberto && !r.aceito);
  if (tolComPlano.length) {
    out.push({
      prioridade: 1,
      titulo: `Acelerar os planos de ${plural(tolComPlano.length, "risco acima da tolerância", "riscos acima da tolerância")}`,
      porque: "Há tratamento em curso, mas o nível atual ainda está além da tolerância.",
      riscos: unicos(tolComPlano.map((r) => r.id)),
    });
  }

  if (f.semTratamento.length) {
    out.push({
      prioridade: 1,
      titulo: `Definir tratamento para ${plural(f.semTratamento.length, "risco Alto ou Crítico", "riscos Altos ou Críticos")}`,
      porque: "A política exige plano de ação ou aceitação formal para todo risco Alto ou Crítico.",
      riscos: unicos(f.semTratamento),
    });
  }

  if (f.acoesAtrasadas.total) {
    out.push({
      prioridade: f.acoesAtrasadas.total >= 5 ? 1 : 2,
      titulo: `Cobrar ${plural(f.acoesAtrasadas.total, "ação atrasada", "ações atrasadas")}`,
      porque: "Prazos vencidos atrasam a redução do risco e a evidência para a auditoria.",
      riscos: unicos(f.acoesAtrasadas.riscos),
    });
  }

  if (f.altoCriticoAgora !== null && f.altoCriticoTresMesesAntes !== null && f.altoCriticoAgora > f.altoCriticoTresMesesAntes) {
    out.push({
      prioridade: 2,
      titulo: "Investigar a alta de riscos Altos e Críticos",
      porque: `Passaram de ${f.altoCriticoTresMesesAntes} para ${f.altoCriticoAgora} nos últimos três meses.`,
      riscos: [],
    });
  }

  if (f.revisoesVencidas) {
    out.push({
      prioridade: 2,
      titulo: `Concluir ${plural(f.revisoesVencidas, "revisão vencida", "revisões vencidas")}`,
      porque: "Risco sem reavaliação no prazo pode estar com nível ou tratamento desatualizado.",
      riscos: [],
    });
  }

  if (f.apetitePendente !== null) {
    out.push({
      prioridade: 2,
      titulo: `Decidir a versão ${f.apetitePendente} do apetite a risco`,
      porque: "A proposta aguarda aprovação do CISO; até lá vale a versão anterior.",
      riscos: [],
    });
  }

  if (f.aceitacoesPendentes) {
    out.push({
      prioridade: 2,
      titulo: `Decidir ${plural(f.aceitacoesPendentes, "aceitação de risco pendente", "aceitações de risco pendentes")}`,
      porque: "Pedidos com Carta de Risco aguardam quem tem alçada.",
      riscos: [],
    });
  }

  if (f.planosAguardandoAuditoria) {
    out.push({
      prioridade: 2,
      titulo: `Auditar ${plural(f.planosAguardandoAuditoria, "plano concluído", "planos concluídos")}`,
      porque: "Sem a validação da Auditoria o controle não conta como implementado e o risco não pode ser mitigado.",
      riscos: [],
    });
  }

  if (f.aceitacoesVencendo.length) {
    out.push({
      prioridade: 3,
      titulo: `Preparar a reavaliação de ${plural(f.aceitacoesVencendo.length, "aceitação", "aceitações")} que vence em até 60 dias`,
      porque: "Ao vencer, o risco aceito volta para reavaliação.",
      riscos: unicos(f.aceitacoesVencendo),
    });
  }

  if (f.acimaApetite) {
    out.push({
      prioridade: 3,
      titulo: `Acompanhar ${plural(f.acimaApetite, "risco acima do apetite", "riscos acima do apetite")}`,
      porque: "Ainda dentro da tolerância, mas acima do nível aceito sem ação adicional.",
      riscos: [],
    });
  }

  if (f.krisSemMedicao) {
    out.push({
      prioridade: 3,
      titulo: `Atualizar ${plural(f.krisSemMedicao, "indicador sem medição recente", "indicadores sem medição recente")}`,
      porque: "Sem medição no prazo, o alerta antecipado deixa de funcionar.",
      riscos: [],
    });
  }

  if (f.semDono || f.controlesNaoAvaliados) {
    const partes = [
      f.semDono ? plural(f.semDono, "risco sem dono", "riscos sem dono") : null,
      f.controlesNaoAvaliados ? plural(f.controlesNaoAvaliados, "risco com controles não avaliados", "riscos com controles não avaliados") : null,
    ].filter(Boolean);
    out.push({
      prioridade: 3,
      titulo: "Completar o cadastro dos riscos",
      porque: `${partes.join(" e ")}.`,
      riscos: [],
    });
  }

  return out
    .map((r, i) => ({ r, i }))
    .sort((a, b) => a.r.prioridade - b.r.prioridade || a.i - b.i)
    .slice(0, limite)
    .map(({ r }) => r);
}
