-- Níveis de risco conforme os critérios de avaliação adotados (ISO/IEC 27005):
-- pontuação = Probabilidade × Impacto (1–25)
--   1–4 Baixo · 5–9 Médio · 10–16 Alto · 20–25 Crítico
-- Substitui a escala anterior (Baixo, Moderado, Significativo, Alto) e
-- recalcula os níveis inerente, atual e projetado de todos os riscos.
-- Onde faltar probabilidade/impacto, só renomeia o rótulo antigo.

UPDATE riscos
SET
  nivel_inicial = CASE
    WHEN probabilidade IS NOT NULL AND impacto IS NOT NULL THEN
      CASE
        WHEN round(probabilidade) * round(impacto) >= 20 THEN 'Crítico'
        WHEN round(probabilidade) * round(impacto) >= 10 THEN 'Alto'
        WHEN round(probabilidade) * round(impacto) >= 5 THEN 'Médio'
        ELSE 'Baixo'
      END
    ELSE CASE nivel_inicial
      WHEN 'Alto' THEN 'Crítico' WHEN 'Significativo' THEN 'Alto'
      WHEN 'Moderado' THEN 'Médio' ELSE nivel_inicial END
  END,
  impacto_qualitativo = CASE
    WHEN COALESCE(prob_nivel_atual, probabilidade) IS NOT NULL AND COALESCE(imp_nivel_atual, impacto) IS NOT NULL THEN
      CASE
        WHEN round(COALESCE(prob_nivel_atual, probabilidade)) * round(COALESCE(imp_nivel_atual, impacto)) >= 20 THEN 'Crítico'
        WHEN round(COALESCE(prob_nivel_atual, probabilidade)) * round(COALESCE(imp_nivel_atual, impacto)) >= 10 THEN 'Alto'
        WHEN round(COALESCE(prob_nivel_atual, probabilidade)) * round(COALESCE(imp_nivel_atual, impacto)) >= 5 THEN 'Médio'
        ELSE 'Baixo'
      END
    ELSE CASE impacto_qualitativo
      WHEN 'Alto' THEN 'Crítico' WHEN 'Significativo' THEN 'Alto'
      WHEN 'Moderado' THEN 'Médio' ELSE impacto_qualitativo END
  END,
  nivel_projetado = CASE
    WHEN COALESCE(prob_nivel_projetado, prob_nivel_atual, probabilidade) IS NOT NULL AND COALESCE(imp_nivel_projetado, imp_nivel_atual, impacto) IS NOT NULL THEN
      CASE
        WHEN round(COALESCE(prob_nivel_projetado, prob_nivel_atual, probabilidade)) * round(COALESCE(imp_nivel_projetado, imp_nivel_atual, impacto)) >= 20 THEN 'Crítico'
        WHEN round(COALESCE(prob_nivel_projetado, prob_nivel_atual, probabilidade)) * round(COALESCE(imp_nivel_projetado, imp_nivel_atual, impacto)) >= 10 THEN 'Alto'
        WHEN round(COALESCE(prob_nivel_projetado, prob_nivel_atual, probabilidade)) * round(COALESCE(imp_nivel_projetado, imp_nivel_atual, impacto)) >= 5 THEN 'Médio'
        ELSE 'Baixo'
      END
    ELSE CASE nivel_projetado
      WHEN 'Alto' THEN 'Crítico' WHEN 'Significativo' THEN 'Alto'
      WHEN 'Moderado' THEN 'Médio' ELSE nivel_projetado END
  END;
