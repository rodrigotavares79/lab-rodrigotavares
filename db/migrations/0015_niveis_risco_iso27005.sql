-- Níveis de risco conforme os critérios de avaliação adotados (ISO/IEC 27005):
-- pontuação = Probabilidade × Impacto (1–25)
--   1–4 Baixo · 5–9 Médio · 10–16 Alto · 20–25 Crítico
-- Substitui a escala anterior (Baixo, Moderado, Significativo, Alto) e
-- recalcula os níveis inerente, atual e projetado de todos os riscos.
-- Onde faltar probabilidade/impacto, só renomeia o rótulo antigo.

CREATE OR REPLACE FUNCTION pg_temp.nivel_27005(p numeric, i numeric, antigo text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p IS NOT NULL AND i IS NOT NULL THEN
      CASE
        WHEN round(p) * round(i) >= 20 THEN 'Crítico'
        WHEN round(p) * round(i) >= 10 THEN 'Alto'
        WHEN round(p) * round(i) >= 5 THEN 'Médio'
        ELSE 'Baixo'
      END
    ELSE
      CASE antigo
        WHEN 'Alto' THEN 'Crítico'
        WHEN 'Significativo' THEN 'Alto'
        WHEN 'Moderado' THEN 'Médio'
        ELSE antigo
      END
  END
$$;

UPDATE riscos
SET
  nivel_inicial = pg_temp.nivel_27005(probabilidade, impacto, nivel_inicial),
  impacto_qualitativo = pg_temp.nivel_27005(
    COALESCE(prob_nivel_atual, probabilidade),
    COALESCE(imp_nivel_atual, impacto),
    impacto_qualitativo
  ),
  nivel_projetado = pg_temp.nivel_27005(
    COALESCE(prob_nivel_projetado, prob_nivel_atual, probabilidade),
    COALESCE(imp_nivel_projetado, imp_nivel_atual, impacto),
    nivel_projetado
  );
