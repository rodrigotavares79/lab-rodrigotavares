"use client";

import { useState } from "react";
import { pieSlices } from "@/lib/chartHelpers";
import s from "./GraficosInicio.module.css";

// Três gráficos pequenos da página inicial do Gestão de Riscos:
// top 3 categorias (barras horizontais), riscos por criticidade (pizza, rótulo
// só no hover) e cobertura de tratamento (gauge).

type Categoria = { categoria: string; total: number };
type Nivel = { nivel: string; total: number };
type Cobertura = { total: number; com_plano: number };

// Paleta categórica validada (contraste e daltonismo) para as 3 barras.
const CORES_CATEGORIA = ["#2f6bab", "#d97a2b", "#7b5ea7"];

// Escala ordinal de criticidade, do mais leve ao mais grave.
const NIVEIS = [
  { nivel: "Baixo", cor: "#6fa77f" },
  { nivel: "Moderado", cor: "#e3b53b" },
  { nivel: "Significativo", cor: "#e08a3c" },
  { nivel: "Alto", cor: "#c0392b" },
];

type Dica = { texto: string; x: number; y: number } | null;

function useDica() {
  const [dica, setDica] = useState<Dica>(null);
  function mostrar(texto: string, e: React.MouseEvent | React.FocusEvent) {
    const card = (e.currentTarget as Element).closest(`.${s.card}`) as HTMLElement | null;
    if (!card) return;
    const caixa = card.getBoundingClientRect();
    if ("clientX" in e) {
      setDica({ texto, x: e.clientX - caixa.left, y: e.clientY - caixa.top });
    } else {
      const alvo = (e.currentTarget as Element).getBoundingClientRect();
      setDica({ texto, x: alvo.left + alvo.width / 2 - caixa.left, y: alvo.top - caixa.top });
    }
  }
  return { dica, mostrar, esconder: () => setDica(null) };
}

function Tooltip({ dica }: { dica: Dica }) {
  if (!dica) return null;
  return (
    <div className={s.tooltip} style={{ left: dica.x, top: dica.y }} role="status">
      {dica.texto}
    </div>
  );
}

function plural(n: number) {
  return `${n} risco${n === 1 ? "" : "s"}`;
}

function BarrasCategorias({ dados, totalAtivos }: { dados: Categoria[]; totalAtivos: number }) {
  const { dica, mostrar, esconder } = useDica();
  const max = Math.max(1, ...dados.map((d) => d.total));
  return (
    <div className={s.card}>
      <h2 className={s.titulo}>Top 3 riscos por categoria</h2>
      {dados.length === 0 ? (
        <p className={s.vazio}>Sem riscos ativos.</p>
      ) : (
        <ul className={s.barras}>
          {dados.map((d, i) => {
            const pct = totalAtivos ? Math.round((d.total / totalAtivos) * 100) : 0;
            const texto = `${d.categoria}: ${plural(d.total)} (${pct}% dos ativos)`;
            return (
              <li
                key={d.categoria}
                className={s.barraLinha}
                tabIndex={0}
                onMouseMove={(e) => mostrar(texto, e)}
                onMouseLeave={esconder}
                onFocus={(e) => mostrar(texto, e)}
                onBlur={esconder}
              >
                <span className={s.barraRotulo}>
                  <span>{d.categoria}</span>
                  <strong>{d.total}</strong>
                </span>
                <span className={s.barraTrilho}>
                  <span
                    className={s.barra}
                    style={{ width: `${(d.total / max) * 100}%`, background: CORES_CATEGORIA[i] }}
                  />
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <Tooltip dica={dica} />
    </div>
  );
}

function PizzaCriticidade({ dados }: { dados: Nivel[] }) {
  const { dica, mostrar, esconder } = useDica();
  const [ativo, setAtivo] = useState<string | null>(null);
  const porNivel = new Map(dados.map((d) => [d.nivel, d.total]));
  const serie = NIVEIS.map((n) => ({ label: n.nivel, value: porNivel.get(n.nivel) || 0, color: n.cor })).filter(
    (d) => d.value > 0
  );
  const total = serie.reduce((t, d) => t + d.value, 0);
  const fatias = pieSlices(serie, 80, 80, 76);
  const resumo = serie.map((d) => `${d.label}: ${d.value}`).join(", ");

  return (
    <div className={s.card}>
      <h2 className={s.titulo}>Riscos por criticidade</h2>
      {total === 0 ? (
        <p className={s.vazio}>Sem riscos ativos.</p>
      ) : (
        <div className={s.centro}>
          <svg viewBox="0 0 160 160" className={s.pizza} role="img" aria-label={`Riscos ativos por criticidade. ${resumo}`}>
            {fatias.map((f) => {
              const texto = `${f.label}: ${plural(f.value)} (${Math.round(Number(f.pct))}%)`;
              return (
                <path
                  key={f.label}
                  d={f.path}
                  fill={f.color}
                  stroke="#ffffff"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  tabIndex={0}
                  aria-label={texto}
                  className={s.fatia}
                  style={{ opacity: ativo && ativo !== f.label ? 0.45 : 1 }}
                  onMouseMove={(e) => {
                    setAtivo(f.label);
                    mostrar(texto, e);
                  }}
                  onMouseLeave={() => {
                    setAtivo(null);
                    esconder();
                  }}
                  onFocus={(e) => {
                    setAtivo(f.label);
                    mostrar(texto, e);
                  }}
                  onBlur={() => {
                    setAtivo(null);
                    esconder();
                  }}
                />
              );
            })}
          </svg>
        </div>
      )}
      <Tooltip dica={dica} />
    </div>
  );
}

function GaugeCobertura({ dados }: { dados: Cobertura | undefined }) {
  const total = dados?.total || 0;
  const comPlano = dados?.com_plano || 0;
  const pct = total ? Math.round((comPlano / total) * 100) : 0;
  // Semicírculo de 180°: comprimento do arco = π·r.
  const r = 70;
  const arco = Math.PI * r;
  return (
    <div className={s.card}>
      <h2 className={s.titulo}>Cobertura de tratamento</h2>
      <div className={s.centro}>
        <svg viewBox="0 0 180 104" className={s.gauge} role="img" aria-label={`${pct}% dos riscos altos e significativos têm plano de ação`}>
          <path d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke="#ecebe7" strokeWidth={16} strokeLinecap="round" />
          {pct > 0 && (
            <path
              d="M 20 90 A 70 70 0 0 1 160 90"
              fill="none"
              stroke="#2f6bab"
              strokeWidth={16}
              strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * arco} ${arco}`}
            />
          )}
          <text x="90" y="82" textAnchor="middle" className={s.gaugeValor}>
            {dados ? `${pct}%` : "—"}
          </text>
        </svg>
        <p className={s.gaugeNota}>
          {dados
            ? `${comPlano} de ${total} riscos altos e significativos com plano de ação`
            : " "}
        </p>
      </div>
    </div>
  );
}

export default function GraficosInicio({
  categorias,
  niveis,
  cobertura,
  totalAtivos,
}: {
  categorias: Categoria[];
  niveis: Nivel[];
  cobertura: Cobertura | undefined;
  totalAtivos: number;
}) {
  return (
    <section aria-label="Gráficos" className={s.linha}>
      <BarrasCategorias dados={categorias} totalAtivos={totalAtivos} />
      <PizzaCriticidade dados={niveis} />
      <GaugeCobertura dados={cobertura} />
    </section>
  );
}
