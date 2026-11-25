import { put, get, del } from "@vercel/blob";
import { createHash, randomUUID } from "node:crypto";

// Evidências dos Planos de Ação ficam num Blob store PRIVADO da Vercel: o
// arquivo nunca abre por link direto (nem URL assinada), só pela rota
// /api/planos-acao/[id]/evidencias/[evidenciaId], que confere a permissão a
// cada acesso (B11). B12: nome aleatório no armazenamento (o nome original
// fica só no banco), conteúdo validado pela assinatura do formato
// (lib/assinaturaArquivo) e hash SHA-256 registrado.
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

export function sha256Hex(dados: Uint8Array): string {
  return createHash("sha256").update(dados).digest("hex");
}

export async function enviarEvidencia(planoId: number | string, dados: Uint8Array, tipo: string) {
  const c = credenciais();
  if (!c) throw new Error("ARMAZENAMENTO_NAO_CONFIGURADO");
  // Nome aleatório: não expõe o nome original nem permite adivinhar caminhos.
  return put(`riscos/evidencias/plano-${planoId}/${randomUUID()}`, Buffer.from(dados), {
    access: "private",
    addRandomSuffix: false,
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
