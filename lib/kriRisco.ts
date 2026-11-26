// B21 · Indicadores-chave de risco (KRIs) a partir dos pontos de gatilho.
// Módulo puro (sem banco, sem imports), testado em tests/kriRisco.test.mts.
//
// - Cada KRI mede um sinal observável ligado a um risco: métrica, unidade,
//   limiares amarelo/vermelho, fonte e frequência de medição.
// - A direção diz se o valor alto é ruim (ex.: CVEs críticas em aberto) ou se
//   o valor baixo é ruim (ex.: % de backups testados com sucesso).
// - Medição no vermelho antecipa a revisão do risco vinculado.

export const DIRECOES_KRI = ["maior_pior", "menor_pior"] as const;
export type DirecaoKri = (typeof DIRECOES_KRI)[number];

export const ROTULO_DIRECAO: Record<DirecaoKri, string> = {
  maior_pior: "Quanto maior, pior",
  menor_pior: "Quanto menor, pior",
};

/** Frequência de medição e quantos dias, no máximo, entre duas medições. */
export const FREQUENCIAS_KRI: Record<string, number> = {
  Semanal: 7,
  Quinzenal: 15,
  Mensal: 31,
  Trimestral: 92,
};

export type FaixaKri = "verde" | "amarelo" | "vermelho";

export const ROTULO_FAIXA: Record<FaixaKri, string> = {
  verde: "Verde",
  amarelo: "Amarelo",
  vermelho: "Vermelho",
};

export type LimitesKri = { direcao: DirecaoKri | string; limite_amarelo: number; limite_vermelho: number };

export type DadosKri = {
  nome?: unknown;
  metrica?: unknown;
  unidade?: unknown;
  direcao?: unknown;
  limiteAmarelo?: unknown;
  limiteVermelho?: unknown;
  fonte?: unknown;
  frequencia?: unknown;
  riscoId?: unknown;
};

function texto(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function numero(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const s = v.trim().replace(/\s/g, "");
  if (!s) return null;
  // Aceita 1.234,5 (pt-BR), 1234,5 e 1234.5.
  const norm = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(norm);
  return Number.isFinite(n) ? n : null;
}

/** Erro do cadastro de um KRI, ou null. */
export function validarKri(d: DadosKri): string | null {
  if (texto(d.nome).length < 5) return "Dê um nome ao KRI (pelo menos 5 caracteres).";
  if (texto(d.metrica).length < 10) return "Descreva a métrica: o que é medido e como (pelo menos 10 caracteres).";
  if (!texto(d.unidade)) return "Informe a unidade (ex.: CVEs, %, horas).";
  if (!(DIRECOES_KRI as readonly string[]).includes(String(d.direcao))) return "Escolha a direção do indicador.";
  const am = numero(d.limiteAmarelo);
  const ve = numero(d.limiteVermelho);
  if (am === null || ve === null) return "Informe os limiares amarelo e vermelho.";
  if (d.direcao === "maior_pior" && !(am < ve)) return "Quando o maior é pior, o limiar amarelo deve ser menor que o vermelho.";
  if (d.direcao === "menor_pior" && !(am > ve)) return "Quando o menor é pior, o limiar amarelo deve ser maior que o vermelho.";
  if (!texto(d.fonte)) return "Informe a fonte do dado (sistema, relatório ou área).";
  if (!(String(d.frequencia) in FREQUENCIAS_KRI)) return "Escolha a frequência de medição.";
  if (!Number.isInteger(Number(d.riscoId)) || Number(d.riscoId) <= 0) return "Vincule o KRI a um risco.";
  return null;
}

/** Faixa de um valor: o limiar conta como atingido (≥ ou ≤). */
export function faixaKri(valor: number, k: LimitesKri): FaixaKri {
  const am = Number(k.limite_amarelo);
  const ve = Number(k.limite_vermelho);
  if (k.direcao === "menor_pior") {
    if (valor <= ve) return "vermelho";
    if (valor <= am) return "amarelo";
    return "verde";
  }
  if (valor >= ve) return "vermelho";
  if (valor >= am) return "amarelo";
  return "verde";
}

export function textoLimites(k: LimitesKri & { unidade?: string | null }): string {
  const s = k.direcao === "menor_pior" ? "≤" : "≥";
  const u = k.unidade ? ` ${k.unidade}` : "";
  return `amarelo ${s} ${fmt(k.limite_amarelo)}${u} · vermelho ${s} ${fmt(k.limite_vermelho)}${u}`;
}

export function fmt(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "—";
  return Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export type SituacaoMedicao = "em_dia" | "atrasada" | "sem_medicao";

export const ROTULO_SITUACAO_MEDICAO: Record<SituacaoMedicao, string> = {
  em_dia: "Medição em dia",
  atrasada: "Medição atrasada",
  sem_medicao: "Sem medição",
};

function dia(d: string): number {
  const [a, m, x] = d.slice(0, 10).split("-").map(Number);
  return Date.UTC(a, m - 1, x);
}

/** A medição está atrasada quando passou mais que a frequência desde a última. */
export function situacaoMedicao(ultima: string | null | undefined, frequencia: string, hoje: string): SituacaoMedicao {
  if (!ultima) return "sem_medicao";
  const limite = FREQUENCIAS_KRI[frequencia] ?? 31;
  const dias = Math.round((dia(hoje) - dia(ultima)) / 86_400_000);
  return dias > limite ? "atrasada" : "em_dia";
}

/** Texto que vai para o risco quando a medição fica no vermelho. */
export function motivoAntecipacao(k: { codigo: string; unidade?: string | null } & LimitesKri, valor: number, referencia: string): string {
  const [a, m, d] = referencia.slice(0, 10).split("-");
  const s = k.direcao === "menor_pior" ? "≤" : "≥";
  const u = k.unidade ? ` ${k.unidade}` : "";
  return `${k.codigo} no vermelho em ${d}/${m}/${a}: ${fmt(valor)}${u} (limiar ${s} ${fmt(k.limite_vermelho)}${u}).`;
}

export function proximoCodigoKri(codigos: string[]): string {
  const maior = codigos.reduce((m, c) => {
    const n = Number(/^KRI-(\d+)$/.exec(c)?.[1]);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `KRI-${String(maior + 1).padStart(3, "0")}`;
}

/** Data em AAAA-MM-DD a partir de AAAA-MM-DD, DD/MM/AAAA ou MM/AAAA (dia 1). */
export function dataReferencia(v: string): string | null {
  const s = v.trim();
  let a: number, m: number, d: number;
  let r = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (r) [a, m, d] = [Number(r[1]), Number(r[2]), Number(r[3])];
  else if ((r = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s))) [d, m, a] = [Number(r[1]), Number(r[2]), Number(r[3])];
  else if ((r = /^(\d{1,2})\/(\d{4})$/.exec(s))) [d, m, a] = [1, Number(r[1]), Number(r[2])];
  else return null;
  const dt = new Date(Date.UTC(a, m - 1, d));
  if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export type LinhaImportada = { codigo: string; referencia: string; valor: number; observacao: string | null; linha: number };

/**
 * Lê o CSV de medições: codigo;referencia;valor[;observacao]. Aceita ; ou
 * tab como separador (vírgula só quando não há ; na linha, para não quebrar
 * o decimal), cabeçalho opcional e datas AAAA-MM-DD, DD/MM/AAAA ou MM/AAAA.
 */
export function lerCsvMedicoes(textoCsv: string): { linhas: LinhaImportada[]; erros: string[] } {
  const linhas: LinhaImportada[] = [];
  const erros: string[] = [];
  textoCsv
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .forEach((bruta, i) => {
      const n = i + 1;
      if (!bruta.trim()) return;
      const sep = bruta.includes(";") ? ";" : bruta.includes("\t") ? "\t" : ",";
      const cols = bruta.split(sep).map((c) => c.trim().replace(/^"(.*)"$/, "$1"));
      if (n === 1 && /c[oó]digo|kri/i.test(cols[0]) && !/^KRI-\d+$/i.test(cols[0])) return; // cabeçalho
      const [codigo, ref, val, ...resto] = cols;
      if (!/^KRI-\d+$/i.test(codigo ?? "")) return void erros.push(`Linha ${n}: código de KRI inválido (${codigo || "vazio"}).`);
      const referencia = dataReferencia(ref ?? "");
      if (!referencia) return void erros.push(`Linha ${n}: data inválida (${ref || "vazia"}).`);
      const valor = numero(val);
      if (valor === null) return void erros.push(`Linha ${n}: valor inválido (${val || "vazio"}).`);
      linhas.push({ codigo: codigo.toUpperCase(), referencia, valor, observacao: resto.join(sep).trim() || null, linha: n });
    });
  return { linhas, erros };
}
