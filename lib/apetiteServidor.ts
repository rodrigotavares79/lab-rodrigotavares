// B18 · Leitura do apetite e da tolerância vigentes no banco. A regra de
// comparação fica em lib/apetiteRisco (pura, testada).
import type { LimiteCategoria } from "@/lib/apetiteRisco";

export async function limitesVigentes(sql: any): Promise<{
  versao: number | null;
  limites: LimiteCategoria[];
  mapa: Map<string, { apetite: string; tolerancia: string }>;
}> {
  const rows = await sql`
    SELECT v.versao, l.categoria, l.apetite, l.tolerancia
    FROM apetite_versoes v JOIN apetite_limites l ON l.versao_id = v.id
    WHERE v.situacao = 'Vigente'
    ORDER BY l.categoria
  `;
  const limites: LimiteCategoria[] = rows.map((r: any) => ({ categoria: r.categoria, apetite: r.apetite, tolerancia: r.tolerancia }));
  return {
    versao: rows[0]?.versao ?? null,
    limites,
    mapa: new Map(limites.map((l) => [l.categoria, { apetite: l.apetite, tolerancia: l.tolerancia }])),
  };
}
