-- B19 (complemento) · Consolidação de riscos repetidos no mesmo projeto.
--
-- fn_consolidar_riscos(principal, duplicados[], email, nome) faz, numa única
-- transação, para cada duplicado:
--   1. guarda a linha inteira em riscos_consolidados (só inserção);
--   2. registra uma ocorrência no risco principal com os dados do duplicado;
--   3. transfere planos de ação e ocorrências do duplicado para o principal;
--   4. exclui o duplicado (o log de alterações registra a exclusão com a
--      linha completa e o usuário).
-- Recusa: riscos de projetos diferentes, principal ou duplicado Mitigado, e
-- duplicado com fatores de risco ou aceitação (mudariam o nível e a decisão
-- do principal). As mesmas regras estão em lib/semelhancaRisco.ts.

BEGIN;

CREATE TABLE IF NOT EXISTS riscos_consolidados (
  risco_id_antigo integer PRIMARY KEY,
  risco_principal_id integer NOT NULL,
  projeto_id integer,
  titulo text,
  registro jsonb NOT NULL,
  planos_transferidos integer NOT NULL DEFAULT 0,
  consolidado_por_email text NOT NULL,
  consolidado_por_nome text,
  consolidado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_riscos_consolidados_principal ON riscos_consolidados (risco_principal_id);

DROP TRIGGER IF EXISTS trg_somente_insercao ON riscos_consolidados;
CREATE TRIGGER trg_somente_insercao
  BEFORE UPDATE OR DELETE ON riscos_consolidados
  FOR EACH ROW EXECUTE FUNCTION fn_somente_insercao();
DROP TRIGGER IF EXISTS trg_sem_truncate ON riscos_consolidados;
CREATE TRIGGER trg_sem_truncate
  BEFORE TRUNCATE ON riscos_consolidados
  FOR EACH STATEMENT EXECUTE FUNCTION fn_somente_insercao();

CREATE OR REPLACE FUNCTION fn_consolidar_riscos(
  p_principal integer, p_duplicados integer[], p_email text, p_nome text
) RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
  pr riscos%ROWTYPE;
  d riscos%ROWTYPE;
  v_id integer;
  v_planos integer;
  v_total integer := 0;
  v_obs text;
BEGIN
  SELECT * INTO pr FROM riscos WHERE id = p_principal FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Risco principal #% não encontrado.', p_principal; END IF;
  IF pr.status = 'Mitigado' THEN RAISE EXCEPTION 'O risco principal #% está Mitigado.', p_principal; END IF;
  IF p_duplicados IS NULL OR array_length(p_duplicados, 1) IS NULL THEN
    RAISE EXCEPTION 'Escolha ao menos um risco para consolidar.';
  END IF;

  FOREACH v_id IN ARRAY p_duplicados LOOP
    IF v_id = p_principal THEN RAISE EXCEPTION 'O risco principal não pode ser consolidado nele mesmo.'; END IF;
    SELECT * INTO d FROM riscos WHERE id = v_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Risco #% não encontrado.', v_id; END IF;
    IF d.projeto_id IS DISTINCT FROM pr.projeto_id THEN
      RAISE EXCEPTION 'O risco #% é de outro projeto: só riscos do mesmo projeto podem ser consolidados.', v_id;
    END IF;
    IF d.status = 'Mitigado' THEN RAISE EXCEPTION 'O risco #% está Mitigado.', v_id; END IF;
    IF EXISTS (SELECT 1 FROM aceitacoes_risco WHERE risco_id = v_id) THEN
      RAISE EXCEPTION 'O risco #% tem pedido ou aceitação de risco.', v_id;
    END IF;
    IF EXISTS (SELECT 1 FROM fatores_risco WHERE risco_id = v_id) THEN
      RAISE EXCEPTION 'O risco #% tem fatores de risco cadastrados.', v_id;
    END IF;

    SELECT COUNT(*) INTO v_planos FROM planos_acao WHERE risco_id = v_id;

    INSERT INTO riscos_consolidados
      (risco_id_antigo, risco_principal_id, projeto_id, titulo, registro, planos_transferidos,
       consolidado_por_email, consolidado_por_nome)
    VALUES (d.id, pr.id, d.projeto_id, d.titulo, to_jsonb(d), v_planos, p_email, p_nome);

    v_obs := format(
      'Risco #%s consolidado neste risco (repetido no mesmo projeto). Levantado por %s em %s; nível %s; status %s%s%s.',
      d.id,
      COALESCE(d.levantado_por, '—'),
      COALESCE(to_char(d.data_levantamento, 'DD/MM/YYYY'), '—'),
      COALESCE(d.impacto_qualitativo, '—'),
      COALESCE(d.status, '—'),
      CASE WHEN d.dono_nome IS NOT NULL THEN '; dono: ' || d.dono_nome ELSE '' END,
      CASE WHEN v_planos > 0 THEN '; planos de ação transferidos: ' || v_planos ELSE '' END
    );
    INSERT INTO ocorrencias_risco
      (risco_id, data_levantamento, fonte, observacao, registrado_por_email, registrado_por_nome)
    VALUES (pr.id, d.data_levantamento, d.fonte, v_obs, p_email, p_nome);

    UPDATE planos_acao SET risco_id = pr.id WHERE risco_id = d.id;
    UPDATE ocorrencias_risco SET risco_id = pr.id WHERE risco_id = d.id;
    DELETE FROM riscos WHERE id = d.id;
    v_total := v_total + 1;
  END LOOP;

  RETURN v_total;
END;
$$;

COMMIT;
