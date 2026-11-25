import { MATRIZ_5X5, NIVEL_RISCO_LABEL, ROTULOS_ESCALA_5 } from "@/lib/metodologiaRisco";
import s from "./MatrizRiscos.module.css";

// Desenho da matriz 5×5 (Probabilidade × Impacto) usada na classificação.
// Lê a mesma tabela do motor de cálculo (lib/metodologiaRisco.ts), então o
// desenho nunca fica diferente da regra aplicada no cadastro.

const ROTULOS_ESCALA = ROTULOS_ESCALA_5;

const CLASSE_NIVEL: Record<number, string> = {
  1: s.nivel1,
  2: s.nivel2,
  3: s.nivel3,
  4: s.nivel4,
};

export default function MatrizRiscos() {
  // Probabilidade 5 no topo, 1 na base — leitura padrão de heat map.
  const linhas = [5, 4, 3, 2, 1];
  const colunas = [1, 2, 3, 4, 5];

  return (
    <figure className={s.figura}>
      <div className={s.grade} role="table" aria-label="Matriz de riscos 5 por 5: Probabilidade por Impacto">
        <div className={s.eixoY} aria-hidden="true">
          Probabilidade
        </div>

        {linhas.map((p) => (
          <div key={p} className={s.linha} role="row">
            <div className={s.rotuloLinha} role="rowheader">
              <strong>{p}</strong>
              <span>{ROTULOS_ESCALA[p - 1]}</span>
            </div>
            {colunas.map((i) => {
              const nivel = MATRIZ_5X5[p - 1][i - 1];
              const label = NIVEL_RISCO_LABEL[nivel];
              return (
                <div
                  key={i}
                  role="cell"
                  className={`${s.celula} ${CLASSE_NIVEL[nivel]}`}
                  title={`Probabilidade ${p} × Impacto ${i} = ${label}`}
                >
                  <span className={s.celulaNivel}>{label}</span>
                  <span className={s.celulaCoord}>
                    P{p} × I{i}
                  </span>
                </div>
              );
            })}
          </div>
        ))}

        <div className={s.linha} role="row">
          <div className={s.canto} aria-hidden="true" />
          {colunas.map((i) => (
            <div key={i} className={s.rotuloColuna} role="columnheader">
              <strong>{i}</strong>
              <span>{ROTULOS_ESCALA[i - 1]}</span>
            </div>
          ))}
        </div>

        <div className={s.eixoX} aria-hidden="true">
          Impacto
        </div>
      </div>

      <figcaption className={s.legenda}>
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={s.legendaItem}>
            <span className={`${s.legendaCor} ${CLASSE_NIVEL[n]}`} aria-hidden="true" />
            {NIVEL_RISCO_LABEL[n]}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
