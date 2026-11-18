import { put, get, del } from "@vercel/blob";

// Anexos de chamados (fotos e PDFs) ficam num Blob store PRIVADO da Vercel:
// o arquivo não abre por link direto, só pela rota
// /api/chamados/[id]/anexos/[anexoId], que confere se quem pede pode ver o
// chamado. O store privado é separado do store público que já existia no
// projeto — por isso usa uma variável própria.
//
// Configuração (Vercel > projeto > Storage > Create > Blob > acesso Private,
// conectado ao projeto com o prefixo de variável CONDOMINIO_BLOB):
//   CONDOMINIO_BLOB_READ_WRITE_TOKEN
//
// Anexos antigos, enviados quando o store ainda era público, são migrados
// para o privado (cópia + exclusão do arquivo público) na primeira vez que
// alguém os abre, ou todos de uma vez pela rota de migração do síndico.

export function tokenPrivado(): string | null {
  return process.env.CONDOMINIO_BLOB_READ_WRITE_TOKEN || null;
}

export function ehUrlPrivada(url: string): boolean {
  return url.includes(".private.blob.vercel-storage.com");
}

export function urlDoAnexoNaApi(chamadoId: number | string, anexoId: number | string): string {
  return `/api/chamados/${chamadoId}/anexos/${anexoId}`;
}

function nomeSeguro(nome: string): string {
  const limpo = nome.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-");
  return limpo.slice(-80) || "arquivo";
}

export async function enviarAnexoPrivado(chamadoId: number | string, arquivo: Blob, nomeOriginal: string, tipo: string) {
  const token = tokenPrivado();
  if (!token) throw new Error("ARMAZENAMENTO_PRIVADO_NAO_CONFIGURADO");
  const caminho = `chamados/${chamadoId}/${Date.now()}-${nomeSeguro(nomeOriginal)}`;
  return put(caminho, arquivo, {
    access: "private",
    addRandomSuffix: true,
    contentType: tipo,
    token,
  });
}

// Copia um anexo antigo (público) para o store privado e apaga o original.
// Devolve a nova URL privada. Se a exclusão do original falhar, a cópia
// privada já vale — o erro é só registrado.
export async function migrarAnexoPublico(chamadoId: number | string, urlPublica: string, tipo: string): Promise<string> {
  const token = tokenPrivado();
  if (!token) throw new Error("ARMAZENAMENTO_PRIVADO_NAO_CONFIGURADO");

  const resposta = await fetch(urlPublica, { cache: "no-store" });
  if (!resposta.ok) throw new Error(`Falha ao baixar anexo antigo (${resposta.status}).`);
  const conteudo = await resposta.blob();

  const nomeOriginal = decodeURIComponent(new URL(urlPublica).pathname.split("/").pop() || "arquivo");
  const novo = await enviarAnexoPrivado(chamadoId, conteudo, nomeOriginal, tipo);

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await del(urlPublica, { token: process.env.BLOB_READ_WRITE_TOKEN });
    } catch (err) {
      console.error("Anexo migrado, mas não foi possível apagar o arquivo público:", urlPublica, err);
    }
  }
  return novo.url;
}

export async function lerAnexoPrivado(url: string) {
  const token = tokenPrivado();
  if (!token) throw new Error("ARMAZENAMENTO_PRIVADO_NAO_CONFIGURADO");
  return get(url, { access: "private", token });
}
