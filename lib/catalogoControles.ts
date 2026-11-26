// B24 · Catálogo de controles e mapeamento por palavra-chave prontos para o
// app: junta lib/conformidadeFrameworks (temas) e lib/mapeamentoControles
// (regras puras).
import { FRAMEWORKS, TEMAS, TEMA_GERAL, mapearRisco, type FrameworkId } from "@/lib/conformidadeFrameworks";
import { montarCatalogo } from "@/lib/mapeamentoControles";

export const CATALOGO_CONTROLES = montarCatalogo([...TEMAS, TEMA_GERAL]);

export function temasDoTexto(texto: string) {
  return mapearRisco(texto);
}

export function nomeFramework(fw: FrameworkId) {
  return `${FRAMEWORKS[fw].nome} ${FRAMEWORKS[fw].versao.split(" ")[0]}`;
}
