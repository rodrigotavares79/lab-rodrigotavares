// "Levantado por" e e-mail de confirmação (B10). Módulo puro (sem banco,
// sem imports), testado em tests/levantadoPor.test.mts.
//
// - Cadastro individual: sempre o usuário logado (o servidor ignora o que
//   vier do navegador).
// - Importação CSV: a coluna "Levantado Por" precisa ser um usuário do
//   sistema; em branco, vale quem está importando.
// - E-mail de confirmação: só para o próprio usuário logado, no máximo
//   LIMITE_EMAILS_POR_HORA por usuário.

export const LIMITE_EMAILS_POR_HORA = 20;

export function resolverLevantadoPorImportacao(
  valorCsv: string | null | undefined,
  emailsDoSistema: string[],
  emailImportador: string
): { email: string } | { erro: string } {
  const valor = (valorCsv ?? "").trim();
  if (!valor) return { email: emailImportador };
  const encontrado = emailsDoSistema.find((e) => e.toLowerCase() === valor.toLowerCase());
  if (!encontrado) {
    return { erro: `'Levantado Por' (${valor}) não é um usuário do sistema. Use o e-mail de um usuário cadastrado ou deixe em branco.` };
  }
  return { email: encontrado };
}

export function podeEnviarConfirmacao(enviadosNaUltimaHora: number): boolean {
  return enviadosNaUltimaHora < LIMITE_EMAILS_POR_HORA;
}
