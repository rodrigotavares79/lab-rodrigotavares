// B21 · Gravação de medições de KRI. A regra de faixa e o texto do alerta
// ficam em lib/kriRisco (pura, testada).
import { faixaKri, motivoAntecipacao, type FaixaKri } from "@/lib/kriRisco";

/**
 * Grava (ou corrige) a medição de uma data. No vermelho, antecipa a revisão
 * do risco vinculado, se for a medição mais recente e a revisão ainda não
 * estiver antecipada. `sql` deve ser o
 * sqlAuditado do usuário.
 */
export async function registrarMedicao(
  sql: any,
  kri: { id: number; codigo: string; risco_id: number; direcao: string; limite_amarelo: number; limite_vermelho: number; unidade: string | null },
  m: { referencia: string; valor: number; observacao: string | null; origem: "manual" | "importado" },
  usuario: { email: string; nome: string }
): Promise<{ faixa: FaixaKri; revisaoAntecipada: boolean }> {
  const faixa = faixaKri(m.valor, kri);
  await sql`
    INSERT INTO kri_medicoes (kri_id, referencia, valor, faixa, origem, observacao, registrado_por_email, registrado_por_nome)
    VALUES (${kri.id}, ${m.referencia}, ${m.valor}, ${faixa}, ${m.origem}, ${m.observacao}, ${usuario.email}, ${usuario.nome})
    ON CONFLICT (kri_id, referencia) DO UPDATE
      SET valor = EXCLUDED.valor, faixa = EXCLUDED.faixa, origem = EXCLUDED.origem, observacao = EXCLUDED.observacao,
          registrado_por_email = EXCLUDED.registrado_por_email, registrado_por_nome = EXCLUDED.registrado_por_nome,
          registrado_em = now()
  `;
  let revisaoAntecipada = false;
  // Só a medição mais recente do KRI dispara o alerta: lançar histórico
  // antigo no vermelho não reabre a revisão de um risco já revisado.
  const [maisNova] = await sql`
    SELECT 1 AS x FROM kri_medicoes WHERE kri_id = ${kri.id} AND referencia > ${m.referencia} LIMIT 1
  `;
  if (faixa === "vermelho" && !maisNova) {
    const rows = await sql`
      UPDATE riscos
      SET revisao_antecipada_em = now(), revisao_antecipada_motivo = ${motivoAntecipacao(kri, m.valor, m.referencia)}
      WHERE id = ${kri.risco_id} AND status <> 'Mitigado'
        AND NOT (revisao_antecipada_em IS NOT NULL AND (revisado_em IS NULL OR revisao_antecipada_em > revisado_em))
      RETURNING id
    `;
    revisaoAntecipada = rows.length > 0;
  }
  return { faixa, revisaoAntecipada };
}

/** KRIs com a última medição e os últimos 12 valores (do mais antigo ao mais novo). */
export async function listarKris(sql: any, filtro: { riscoId?: number | null; id?: number | null } = {}) {
  const riscoId = filtro.riscoId ?? null;
  const id = filtro.id ?? null;
  return sql`
    SELECT k.*, r.titulo AS risco_titulo, r.gatilho AS risco_gatilho, r.impacto_qualitativo AS risco_nivel,
           r.status AS risco_status, p.nome AS projeto,
           u.referencia AS ultima_referencia, u.valor AS ultimo_valor, u.faixa AS ultima_faixa,
           COALESCE((
             SELECT json_agg(json_build_object('referencia', to_char(h.referencia, 'YYYY-MM-DD'), 'valor', h.valor, 'faixa', h.faixa) ORDER BY h.referencia)
             FROM (SELECT * FROM kri_medicoes x WHERE x.kri_id = k.id ORDER BY x.referencia DESC LIMIT 12) h
           ), '[]'::json) AS historico
    FROM kris k
    JOIN riscos r ON r.id = k.risco_id
    JOIN projetos p ON p.id = r.projeto_id
    LEFT JOIN LATERAL (
      SELECT to_char(referencia, 'YYYY-MM-DD') AS referencia, valor, faixa
      FROM kri_medicoes WHERE kri_id = k.id ORDER BY referencia DESC LIMIT 1
    ) u ON true
    WHERE (${riscoId}::int IS NULL OR k.risco_id = ${riscoId}::int)
      AND (${id}::int IS NULL OR k.id = ${id}::int)
    ORDER BY (u.faixa = 'vermelho') DESC NULLS LAST, (u.faixa = 'amarelo') DESC NULLS LAST, k.codigo
  `;
}
