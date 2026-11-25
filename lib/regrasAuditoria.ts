// Regras da decisão de auditoria de um plano (B08). Módulo puro (sem banco,
// sem imports), usado pela rota POST /api/auditoria/[planoId], pela tela da
// Auditoria e pelos testes (tests/regrasAuditoria.test.mts).
//
// - Conforme exige pelo menos uma evidência anexada ao plano: sem evidência
//   não há o que validar.
// - Não conforme exige comentário com o motivo (o plano volta para correção).

export type ResultadoAuditoria = "Conforme" | "Não conforme";

export const MSG_SEM_EVIDENCIA =
  "Este plano não tem evidência anexada. Sem evidência não é possível marcar Conforme: classifique como Não conforme e peça a evidência no comentário.";

export function validarDecisaoAuditoria(d: {
  resultado: unknown;
  comentario: string | null;
  totalEvidencias: number;
}): string | null {
  if (d.resultado !== "Conforme" && d.resultado !== "Não conforme") return "Resultado inválido.";
  if (d.resultado === "Não conforme" && !d.comentario?.trim()) {
    return "Informe o motivo da não conformidade no comentário.";
  }
  if (d.resultado === "Conforme" && d.totalEvidencias < 1) return MSG_SEM_EVIDENCIA;
  return null;
}
