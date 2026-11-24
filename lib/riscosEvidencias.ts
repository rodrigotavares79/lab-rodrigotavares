import { put, get, del } from "@vercel/blob";

// Evidências dos Planos de Ação ficam num Blob store PRIVADO da Vercel: o
// arquivo nunca abre por link direto, só pela rota
// /api/planos-acao/[id]/evidencias/[evidenciaId], que exige login.
//
// Usa um store próprio (prefixo de variável RISCOS_BLOB) quando existir; sem
// ele, aproveita o store privado do Condomínio (CONDOMINIO_BLOB), numa pasta
// separada (riscos/evidencias/...).

type Credenciais = { token: string } | { storeId: string };

function credenciais(): Credenciais | null {
  if (process.env.RISCOS_BLOB_READ_WRITE_TOKEN) return { token: process.env.RISCOS_BLOB_READ_WRITE_TOKEN };
  if (process.env.RISCOS_BLOB_STORE_ID) return { storeId: process.env.RISCOS_BLOB_STORE_ID };
  if (process.env.CONDOMINIO_BLOB_READ_WRITE_TOKEN) return { token: process.env.CONDOMINIO_BLOB_READ_WRITE_TOKEN };
  if (process.env.CONDOMINIO_BLOB_STORE_ID) return { storeId: process.env.CONDOMINIO_BLOB_STORE_ID };
  return null;
}

export function armazenamentoEvidenciasConfigurado(): boolean {
  return credenciais() !== null;
}

export const TAMANHO_MAXIMO_EVIDENCIA = 10 * 1024 * 1024; // 10 MB

export const TIPOS_EVIDENCIA: Record<string, string> = {
  "application/pdf": "PDF",
  "image/png": "PNG",
  "image/jpeg": "JPEG",
  "image/webp": "WEBP",
  "text/plain": "TXT",
  "text/csv": "CSV",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "message/rfc822": "EML",
};

export function urlDaEvidencia(planoId: number | string, evidenciaId: number | string): string {
  return `/api/planos-acao/${planoId}/evidencias/${evidenciaId}`;
}

function nomeSeguro(nome: string): string {
  const limpo = nome.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-");
  return limpo.slice(-80) || "arquivo";
}

export async function enviarEvidencia(planoId: number | string, arquivo: Blob, nomeOriginal: string, tipo: string) {
  const c = credenciais();
  if (!c) throw new Error("ARMAZENAMENTO_NAO_CONFIGURADO");
  return put(`riscos/evidencias/plano-${planoId}/${Date.now()}-${nomeSeguro(nomeOriginal)}`, arquivo, {
    access: "private",
    addRandomSuffix: true,
    contentType: tipo,
    ...c,
  });
}

export async function lerEvidencia(url: string) {
  const c = credenciais();
  if (!c) throw new Error("ARMAZENAMENTO_NAO_CONFIGURADO");
  return get(url, { access: "private", ...c });
}

export async function apagarEvidencia(url: string) {
  const c = credenciais();
  if (!c) throw new Error("ARMAZENAMENTO_NAO_CONFIGURADO");
  await del(url, c);
}
