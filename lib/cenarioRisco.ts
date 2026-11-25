// B13 · Cenário de risco estruturado: causa → evento → consequência.
//
// O título do risco é montado a partir dos três campos, no padrão
//   "Risco de [evento] devido a [causa], resultando em [consequência]".
// O ponto de gatilho deixa de ser o nome do risco: é o sinal observável que
// indica que o risco está se materializando (base dos KRIs, B21).
//
// IMPORTANTE: a mesma regra roda no banco (fn_titulo_risco, migration 0024),
// que mantém riscos.titulo em qualquer caminho de gravação. Se mudar aqui,
// mude lá.
//
// Sem imports: o módulo roda direto no `node --test`.

export const TAMANHO_MINIMO_CAMPO = 5;
export const TAMANHO_MAXIMO_CAMPO = 300;

export type Cenario = {
  causa?: string | null;
  evento?: string | null;
  consequencia?: string | null;
};

// Tira espaços e ponto final, e põe a inicial em minúscula para encaixar no
// meio da frase — exceto quando a palavra é sigla ("SSL", "CVE", "DNS"), ou
// seja, quando a segunda letra também é maiúscula.
export function trechoParaTitulo(texto: string | null | undefined): string {
  let t = String(texto ?? "").trim().replace(/\s+/g, " ");
  t = t.replace(/[.;\s]+$/, "");
  if (t.length >= 2) {
    const primeira = t[0];
    const segunda = t[1];
    const ehLetraMaiuscula = (c: string) => c !== c.toLowerCase() && c === c.toUpperCase();
    if (ehLetraMaiuscula(primeira) && !ehLetraMaiuscula(segunda)) {
      t = primeira.toLowerCase() + t.slice(1);
    }
  }
  return t;
}

export function cenarioCompleto(c: Cenario): boolean {
  return [c.causa, c.evento, c.consequencia].every((x) => trechoParaTitulo(x).length > 0);
}

// Título no padrão da metodologia; null se faltar alguma das três partes.
export function montarTituloRisco(c: Cenario): string | null {
  if (!cenarioCompleto(c)) return null;
  return `Risco de ${trechoParaTitulo(c.evento)} devido a ${trechoParaTitulo(c.causa)}, resultando em ${trechoParaTitulo(c.consequencia)}`;
}

// Nome para exibir em listas: o título montado; para risco ainda sem
// cenário, cai para o ponto de gatilho e depois para a categoria.
export function nomeExibicaoRisco(r: {
  titulo?: string | null;
  gatilho?: string | null;
  categoria?: string | null;
}): string {
  return r.titulo || r.gatilho || r.categoria || "Risco sem descrição";
}

const ROTULOS: Record<keyof Cenario, string> = {
  causa: "Causa",
  evento: "Evento",
  consequencia: "Consequência",
};

// Valida os três campos obrigatórios do cenário. Devolve a mensagem de erro
// ou null.
export function validarCenario(c: Cenario): string | null {
  for (const campo of ["causa", "evento", "consequencia"] as (keyof Cenario)[]) {
    const v = String(c[campo] ?? "").trim();
    if (!v) return `Preencha o campo ${ROTULOS[campo]} do cenário de risco.`;
    if (v.length < TAMANHO_MINIMO_CAMPO) return `${ROTULOS[campo]}: descreva com pelo menos ${TAMANHO_MINIMO_CAMPO} caracteres.`;
    if (v.length > TAMANHO_MAXIMO_CAMPO) return `${ROTULOS[campo]}: use no máximo ${TAMANHO_MAXIMO_CAMPO} caracteres.`;
  }
  return null;
}
