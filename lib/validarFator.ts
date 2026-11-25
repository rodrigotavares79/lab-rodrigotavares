import {
  OPCOES_NATUREZA_FATOR,
  OPCOES_CRITICIDADE,
  OPCOES_TIPO_CONTROLE,
  OPCOES_NATUREZA_CONTROLE,
  OPCOES_EFICACIA_POTENCIAL,
  OPCOES_STATUS_IMPLEMENTACAO,
  OPCOES_VETOR,
} from "@/lib/metodologiaRisco";

// Validação de um fator de risco com o seu controle (rota de fatores e, no
// B15, os controles informados no cadastro do risco). `exigirRisco=false`
// dispensa o riscoId, que no cadastro ainda não existe.
export function validarFator(body: any, exigirRisco = true): string | null {
  if (exigirRisco && !body?.riscoId) return "riscoId é obrigatório.";
  if (!body?.descricao?.trim()) return "Descrição do fator é obrigatória.";
  if (!OPCOES_NATUREZA_FATOR.includes(body?.natureza)) return `Natureza inválida. Use um de: ${OPCOES_NATUREZA_FATOR.join(", ")}.`;
  if (!OPCOES_CRITICIDADE.includes(body?.criticidade)) return `Criticidade inválida. Use um de: ${OPCOES_CRITICIDADE.join(", ")}.`;
  if (!body?.controleDescricao?.trim()) return "Descrição do controle é obrigatória.";
  if (!OPCOES_TIPO_CONTROLE.includes(body?.tipoControle)) return `Tipo de controle inválido. Use um de: ${OPCOES_TIPO_CONTROLE.join(", ")}.`;
  if (!OPCOES_NATUREZA_CONTROLE.includes(body?.naturezaControle)) return `Natureza do controle inválida. Use um de: ${OPCOES_NATUREZA_CONTROLE.join(", ")}.`;
  if (!OPCOES_EFICACIA_POTENCIAL.includes(body?.eficaciaPotencial)) return `Eficácia potencial inválida. Use um de: ${OPCOES_EFICACIA_POTENCIAL.join(", ")}.`;
  if (body?.statusImplementacao && !OPCOES_STATUS_IMPLEMENTACAO.includes(body.statusImplementacao)) return `Status de implementação inválido.`;
  if (body?.vetorOverride && !OPCOES_VETOR.includes(body.vetorOverride)) return `Vetor de override inválido.`;
  if (body?.vetorOverride && !body?.justificativaOverride?.trim()) return "Justificativa do override é obrigatória quando o vetor sugerido é sobrescrito.";
  return null;
}
