import { gerarXlsx, baixarArquivo, type Aba } from "@/lib/planilhaXlsx";

// Exporta os dados da tela de Relatórios para uma planilha Excel (.xlsx),
// gerada no próprio navegador, com uma aba por bloco do relatório.

type Painel = {
  porStatus: { status: string; total: number }[];
  porServico: { servico: string; total: number }[];
  porFornecedor: { fornecedor: string; total: number }[];
  sla: { rotulo: string; total: number }[];
};

export type DadosExportacao = {
  periodo: string;
  geradoEm: string;
  kpis: { indicador: string; valor: string | number }[];
  finalizados: Painel;
  andamento: Painel;
  rotuloAtividade: string;
  atividade: { dia: string; abertos: number; encerrados: number }[];
  porTipo: { tipo: string; total: number }[];
  rotuloRecentes: string;
  recentes: { id: number; titulo: string; status: string; urgencia: string | null; aberto_por_nome: string; criado_em: string }[];
};

function abaPainel(nome: string, p: Painel): Aba {
  return {
    nome,
    cabecalho: ["Grupo", "Item", "Quantidade"],
    larguras: [18, 42, 14],
    linhas: [
      ...p.porStatus.map((x) => ["Por status", x.status, x.total]),
      ...p.sla.map((x) => ["SLA", x.rotulo, x.total]),
      ...p.porServico.map((x) => ["Por serviço", x.servico, x.total]),
      ...p.porFornecedor.map((x) => ["Por fornecedor", x.fornecedor, x.total]),
    ],
  };
}

export function exportarRelatorioExcel(dados: DadosExportacao, nomeArquivo: string) {
  const abas: Aba[] = [
    {
      nome: "Resumo",
      cabecalho: ["Indicador", "Valor"],
      larguras: [44, 30],
      linhas: [
        ["Período", dados.periodo],
        ["Gerado em", dados.geradoEm],
        [null, null],
        ...dados.kpis.map((k) => [k.indicador, k.valor]),
      ],
    },
    abaPainel("Finalizados", dados.finalizados),
    abaPainel("Em andamento", dados.andamento),
    {
      nome: "Atividade diária",
      cabecalho: ["Dia", "Abertos", "Encerrados"],
      larguras: [14, 12, 12],
      linhas: dados.atividade.map((a) => [a.dia.split("-").reverse().join("/"), a.abertos, a.encerrados]),
    },
    {
      nome: "Problemas x Demandas",
      cabecalho: ["Tipo", `Quantidade (${dados.rotuloAtividade})`],
      larguras: [18, 34],
      linhas: dados.porTipo.map((t) => [t.tipo, t.total]),
    },
    {
      nome: dados.rotuloRecentes,
      cabecalho: ["ID", "Título", "Status", "Urgência", "Aberto por", "Data"],
      larguras: [8, 46, 22, 12, 26, 18],
      linhas: dados.recentes.map((r) => [
        r.id,
        r.titulo,
        r.status,
        r.urgencia,
        r.aberto_por_nome,
        new Date(r.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }),
      ]),
    },
  ];
  baixarArquivo(gerarXlsx(abas), nomeArquivo);
}
