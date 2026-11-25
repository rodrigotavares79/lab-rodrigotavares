// Validação do conteúdo real das evidências (B12). Módulo puro (sem banco,
// sem imports), testado em tests/assinaturaArquivo.test.mts.
//
// O tipo informado pelo navegador (Content-Type) pode ser forjado: um
// executável renomeado para .pdf chega como application/pdf. Aqui o arquivo
// só é aceito se a extensão, o tipo declarado e os primeiros bytes
// ("assinatura" do formato) concordam.

type Regra = { extensoes: string[]; confere: (b: Uint8Array) => boolean };

function comeca(b: Uint8Array, ...bytes: number[]): boolean {
  return bytes.every((v, i) => b[i] === v);
}

function texto(b: Uint8Array): boolean {
  // Texto simples: sem byte nulo e sem cabeçalhos de executável nos 8 KB
  // iniciais.
  const inicio = b.subarray(0, 8192);
  if (inicio.includes(0)) return false;
  if (comeca(inicio, 0x4d, 0x5a)) return false; // "MZ" (executável Windows)
  if (comeca(inicio, 0x7f, 0x45, 0x4c, 0x46)) return false; // ELF
  return true;
}

const ZIP = (b: Uint8Array) => comeca(b, 0x50, 0x4b, 0x03, 0x04);

export const REGRAS_EVIDENCIA: Record<string, Regra> = {
  "application/pdf": { extensoes: ["pdf"], confere: (b) => comeca(b, 0x25, 0x50, 0x44, 0x46, 0x2d) }, // %PDF-
  "image/png": { extensoes: ["png"], confere: (b) => comeca(b, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a) },
  "image/jpeg": { extensoes: ["jpg", "jpeg"], confere: (b) => comeca(b, 0xff, 0xd8, 0xff) },
  "image/webp": {
    extensoes: ["webp"],
    confere: (b) => comeca(b, 0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
  "text/plain": { extensoes: ["txt", "log"], confere: texto },
  "text/csv": { extensoes: ["csv"], confere: texto },
  "message/rfc822": { extensoes: ["eml"], confere: texto },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { extensoes: ["xlsx"], confere: ZIP },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { extensoes: ["docx"], confere: ZIP },
};

/** Tipos que o navegador pode exibir sem risco; o resto é baixado. */
export const TIPOS_EXIBIVEIS = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

function extensao(nome: string): string {
  const i = nome.lastIndexOf(".");
  return i >= 0 ? nome.slice(i + 1).toLowerCase() : "";
}

/** Motivo da recusa, ou null se o arquivo é aceito. */
export function validarConteudoEvidencia(tipoDeclarado: string, nome: string, bytes: Uint8Array): string | null {
  const regra = REGRAS_EVIDENCIA[tipoDeclarado];
  if (!regra) return "Tipo de arquivo não permitido.";
  if (!regra.extensoes.includes(extensao(nome))) {
    return `A extensão do arquivo não corresponde ao tipo (${regra.extensoes.map((e) => "." + e).join(", ")}).`;
  }
  if (bytes.length === 0) return "O arquivo está vazio.";
  if (!regra.confere(bytes)) return "O conteúdo do arquivo não corresponde ao tipo informado.";
  return null;
}
