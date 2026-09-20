// Constantes compartilhadas entre o Cadastro e a Edição de Sistema de IA —
// um só lugar pra listas de opções e regras derivadas (evita a lista de
// Tipo, por exemplo, divergir entre as duas telas).

export const TIPOS = ["Texto/Chat", "Imagem", "Vídeo", "Cálculos", "Desenvolvimento"];

export const AREAS = [
  "Tecnologia da Informação",
  "Recursos Humanos",
  "Financeiro",
  "Jurídico",
  "Comercial / Vendas",
  "Marketing",
  "Operações",
  "Atendimento ao Cliente",
  "Diretoria",
  "Outro",
];

export const OPCOES_DADOS_TRATADOS = ["Pessoais", "Sensíveis", "Negócio"];

// Todo sistema que trata dados Pessoais e/ou Sensíveis é sinalizado
// automaticamente — não depende de alguém marcar isso manualmente.
export function requerAtencao(dadosTratados: string | null): boolean {
  const valor = dadosTratados || "";
  return valor.includes("Pessoais") || valor.includes("Sensíveis");
}

// Cadência de revisão periódica: 6 meses pra sistemas que "Requer
// atenção" (dados pessoais/sensíveis), 1 ano pros demais.
export function mesesDeRevisao(dadosTratados: string | null): number {
  return requerAtencao(dadosTratados) ? 6 : 12;
}

// Próxima revisão = data da última revisão (ou, se nunca revisado, data
// de cadastro) + a cadência. Recalculado sempre a partir desses dois
// dados — nunca fica "parado" num valor gravado que poderia ficar
// desatualizado.
export function calcularProximaRevisao(
  criadoEm: string,
  ultimaRevisaoEm: string | null,
  dadosTratados: string | null
): Date {
  const base = new Date(String(ultimaRevisaoEm || criadoEm).slice(0, 10) + "T00:00:00");
  const proxima = new Date(base);
  proxima.setMonth(proxima.getMonth() + mesesDeRevisao(dadosTratados));
  return proxima;
}

export function formatarData(data: Date | string | null): string {
  if (!data) return "—";
  const d = typeof data === "string" ? new Date(String(data).slice(0, 10) + "T00:00:00") : data;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}
