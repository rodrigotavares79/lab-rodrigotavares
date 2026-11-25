import { statusAutomatico, type ResumoPlanos, type StatusRisco } from "@/lib/statusRisco";

// Lê quantos planos de ação o risco tem e quantos estão Conforme.
export async function resumoPlanos(sql: any, riscoId: number | string): Promise<ResumoPlanos> {
  const [linha] = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE auditoria_status = 'Conforme')::int AS conformes
    FROM planos_acao WHERE risco_id = ${riscoId}
  `;
  return { total: linha?.total ?? 0, conformes: linha?.conformes ?? 0 };
}

// Ajusta o status do risco ao que as regras exigem depois de uma mudança nos
// planos (ver statusAutomatico). Devolve o status final.
export async function sincronizarStatusRisco(sql: any, riscoId: number | string): Promise<StatusRisco | null> {
  const rows = await sql`SELECT status FROM riscos WHERE id = ${riscoId}`;
  if (rows.length === 0) return null;
  const atual = rows[0].status as StatusRisco | null;
  const planos = await resumoPlanos(sql, riscoId);
  const novo = statusAutomatico(atual, planos);
  if (novo !== atual) {
    // A condição no WHERE evita sobrescrever um risco que acabou de ser
    // mitigado por outra pessoa entre a leitura e a escrita.
    await sql`
      UPDATE riscos SET status = ${novo}
      WHERE id = ${riscoId} AND status IS DISTINCT FROM 'Mitigado'
    `;
  }
  return novo;
}
