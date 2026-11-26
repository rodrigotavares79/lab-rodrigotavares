// B20 · Fonte única dos termos da Política e do Processo: categorias de risco
// (com a fronteira entre elas), etapas do ciclo de vida e o exemplo de
// apontamento financeiro. Política, Processo, cadastro, catálogo de cenários
// e apetite leem daqui, então os textos não divergem entre telas.
//
// Sem imports: o módulo roda direto no `node --test`.

export type CategoriaRisco = {
  nome: string;
  /** Pergunta-chave: a categoria é a resposta "sim" a ela. */
  pergunta: string;
  definicao: string;
  exemplos: string;
};

/**
 * A categoria diz a NATUREZA PREDOMINANTE do risco: onde a causa ou a
 * consequência principal está. Na dúvida, vale a ordem de desempate da
 * Política (Segurança da Informação → Tecnológico → Conformidade → demais).
 */
export const CATEGORIAS_RISCO: CategoriaRisco[] = [
  {
    nome: "Segurança da Informação",
    pergunta: "Há um agente de ameaça ou a violação de um controle de segurança?",
    definicao:
      "Eventos que comprometem a confidencialidade, a integridade ou a disponibilidade da informação por ação intencional (ataque, fraude, uso indevido) ou por falha de um controle de segurança.",
    exemplos: "Exploração de vulnerabilidade, ransomware, phishing, acesso indevido, vazamento de dados, credencial comprometida.",
  },
  {
    nome: "Tecnológico",
    pergunta: "A tecnologia falha sem que ninguém a ataque?",
    definicao:
      "Falhas, limitações ou obsolescência de sistemas, infraestrutura e serviços de TI sem agente de ameaça: defeito, capacidade, mudança mal executada, dependência técnica de fornecedor.",
    exemplos: "Falha de storage, fim de suporte de sistema, rotina de backup que falha, lentidão por falta de capacidade, integração instável.",
  },
  {
    nome: "Operacional",
    pergunta: "O problema está em processos, pessoas ou execução, e não na tecnologia?",
    definicao: "Falhas em processos de negócio ou de TI, erros humanos, falta de pessoas ou de conhecimento, execução fora do padrão.",
    exemplos: "Atraso em processo essencial, erro de operação, dependência de uma única pessoa, procedimento inexistente.",
  },
  {
    nome: "Conformidade / Regulatório",
    pergunta: "A consequência principal é descumprir lei, norma, contrato ou auditoria?",
    definicao: "Descumprimento de leis (como a LGPD), regulações, normas internas, cláusulas contratuais ou recomendações de auditoria.",
    exemplos: "Tratamento de dados pessoais sem base legal, licença de software irregular, apontamento de auditoria não tratado.",
  },
  {
    nome: "Financeiro",
    pergunta: "A consequência principal é perda ou desvio de recursos financeiros?",
    definicao: "Perdas financeiras diretas, estouro de orçamento ou custos inesperados ligados a TI e segurança.",
    exemplos: "Variação de custos de TI frente ao orçado, multa contratual, reajuste cambial de licenças.",
  },
  {
    nome: "Estratégico",
    pergunta: "A consequência principal é não atingir um objetivo ou projeto de negócio?",
    definicao: "Ameaças aos objetivos e projetos da organização: atrasos, escolhas de tecnologia, dependência de parceiros estratégicos.",
    exemplos: "Atraso na execução de projeto estratégico, tecnologia escolhida que não escala, saída de parceiro-chave.",
  },
  {
    nome: "Reputacional",
    pergunta: "A consequência principal é a imagem perante clientes, imprensa ou mercado?",
    definicao: "Danos à imagem e à confiança de clientes, parceiros e sociedade.",
    exemplos: "Queda na satisfação de clientes, exposição negativa na imprensa após incidente.",
  },
];

export const NOMES_CATEGORIAS = CATEGORIAS_RISCO.map((c) => c.nome);

export type EtapaProcesso = { nome: string; resumo: string; detalhe: string };

/** As seis etapas do ciclo de vida do risco, iguais na Política e no Processo. */
export const ETAPAS_PROCESSO: EtapaProcesso[] = [
  {
    nome: "Identificação",
    resumo: "Reconhecer o risco a partir de um ponto de gatilho.",
    detalhe:
      "Qualquer colaborador, área, projeto ou auditoria reconhece o risco a partir de um ponto de gatilho observável: uma vulnerabilidade, um incidente, uma mudança de cenário ou um KRI fora da faixa.",
  },
  {
    nome: "Cadastro",
    resumo: "Registrar causa, evento, consequência, categoria e dono.",
    detalhe:
      "O risco é registrado no sistema com causa, evento e consequência, categoria, ativo ou processo afetado e dono do risco. O sistema sugere riscos semelhantes e cenários do catálogo para evitar duplicidade.",
  },
  {
    nome: "Análise e Avaliação",
    resumo: "Medir o nível, comparar com o apetite e estimar a perda.",
    detalhe:
      "Probabilidade e impacto (1 a 5) geram o nível inerente; os controles existentes geram o nível atual. O nível atual é comparado com o apetite e a tolerância da categoria e, quando possível, a exposição é estimada em reais (perda anual esperada).",
  },
  {
    nome: "Tratamento",
    resumo: "Escolher entre mitigar, transferir, evitar ou aceitar.",
    detalhe:
      "Mitigar, transferir ou evitar levam a um plano de ação com responsável, ações e prazos. Aceitar exige Carta de Risco aprovada pela alçada do nível, com validade. Riscos Alto e Crítico precisam de tratamento definido no prazo da política.",
  },
  {
    nome: "Monitoramento",
    resumo: "Acompanhar planos, KRIs e revisões periódicas.",
    detalhe:
      "O dono acompanha as ações; KRIs são medidos na frequência definida; o risco é reavaliado no prazo do seu nível ou antes, se um KRI ficar vermelho. O Comitê de Riscos revisa o portfólio pelo Dashboard e pelo Relatório Executivo.",
  },
  {
    nome: "Encerramento",
    resumo: "Auditar o plano com evidência e encerrar o risco.",
    detalhe:
      "Concluído o plano, um auditor independente o avalia com evidências. Só com todos os planos Conformes o risco pode ser marcado como Mitigado. Uma aceitação vencida devolve o risco à etapa de Análise e Avaliação.",
  },
];

/**
 * Exemplo fictício de apontamento financeiro (caso de tecnologia), usado na
 * Política e no Processo. Os números são conferidos contra o motor de
 * cálculo em tests/politicaRiscos.test.mts.
 */
export const EXEMPLO_EXPOSICAO = {
  risco:
    "Risco de indisponibilidade do ERP devido a falha no storage do datacenter, resultando em parada do faturamento e da expedição",
  ativo: "ERP Corporativo",
  categoria: "Tecnológico",
  custoHora: 18000,
  frequencia: { min: 0.2, provavel: 0.5, max: 1 },
  horasParada: { min: 4, provavel: 8, max: 24 },
  // Resultados esperados (motor de cálculo de lib/exposicaoRisco.ts).
  esperado: {
    perdaEvento: { min: 72000, provavel: 144000, max: 432000 },
    pertFrequencia: 0.5333,
    pertPerda: 180000,
    ale: 96000,
    aleMin: 14400,
    aleMax: 432000,
  },
  // Plano proposto, para mostrar a leitura de custo x benefício.
  plano: {
    descricao: "Replicação síncrona do storage e procedimento de failover testado a cada semestre",
    custoAnual: 40000,
    frequenciaDepois: { min: 0.1, provavel: 0.2, max: 0.5 },
    horasDepois: { min: 1, provavel: 2, max: 6 },
    aleDepoisEsperada: 10500,
  },
};
