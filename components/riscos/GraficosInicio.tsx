"use client";

import { useState } from "react";
import { pieSlices } from "@/lib/chartHelpers";
import s from "./GraficosInicio.module.css";

// Três gráficos pequenos da página inicial do Gestão de Riscos:
// top 3 categorias (barras horizontais), riscos por criticidade (pizza, rótulo
// só no hover) e mitigação trimestral de riscos críticos e altos (gauge).

type Categoria = { categoria: string; total: number };
type Nivel = { nivel: string; total: number };
type Trimestre = { trimestre: number; total: number; mitigados: number };

// Paleta categórica validada (contraste e daltonismo) para as 3 barras.
const CORES_CATEGORIA = ["#2f6bab", "#d97a2b", "#7b5ea7"];

// Escala ordinal de criticidade, do mais leve ao mais grave.
const NIVEIS = [
  { nivel: "Baixo", cor: "#6fa77f" },
  { nivel: "Médio", cor: "#e3b53b" },
  { nivel: "Alto", cor: "#e08a3c" },
  { nivel: "Crítico", cor: "#c0392b" },
];

type Dica = { texto: React.ReactNode; x: number; y: number } | null;

function useDica() {
  const [dica, setDica] = useState<Dica>(null);
  function mostrar(texto: React.ReactNode, e: React.MouseEvent | React.FocusEvent) {
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

// Faixas do gauge: até 50% vermelho, de 50,1% a 69,9% amarelo, 70% (meta) ou
// mais verde.
const META = 70;
const COR_VERMELHO = "#c0392b";
const COR_AMARELO = "#e3b53b";
const COR_VERDE = "#3f7d58";
const COR_SEM_DADOS = "#b8b6af";

function corFaixa(pct: number) {
  if (pct >= META) return COR_VERDE;
  if (pct > 50) return COR_AMARELO;
  return COR_VERMELHO;
}

function pctTrimestre(t: Trimestre) {
  return t.total ? Math.round((t.mitigados / t.total) * 1000) / 10 : null;
}

function formatPct(n: number) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";
}

// Geometria do gauge: semicírculo com centro (CX, CY), anel entre R_IN e R_OUT.
const CX = 130;
const CY = 124;
const R_OUT = 92;
const R_IN = 50;

// Cores das zonas (mais claras que as dos bullets, como num velocímetro).
const ZONAS = [
  { de: 0, ate: 50, cor: "#f07a74" },
  { de: 50, ate: META, cor: "#fbd55b" },
  { de: META, ate: 100, cor: "#a6d873" },
];

// Ponto no semicírculo para uma fração de 0 (esquerda) a 1 (direita).
function ponto(f: number, r: number) {
  const ang = Math.PI * (1 - f);
  return { x: CX + r * Math.cos(ang), y: CY - r * Math.sin(ang) };
}

function fmt(n: number) {
  return n.toFixed(2);
}

// Setor do anel entre as frações f0 e f1.
function setor(f0: number, f1: number) {
  const a = ponto(f0, R_OUT);
  const b = ponto(f1, R_OUT);
  const c = ponto(f1, R_IN);
  const d = ponto(f0, R_IN);
  return `M ${fmt(a.x)} ${fmt(a.y)} A ${R_OUT} ${R_OUT} 0 0 1 ${fmt(b.x)} ${fmt(b.y)} L ${fmt(c.x)} ${fmt(c.y)} A ${R_IN} ${R_IN} 0 0 0 ${fmt(d.x)} ${fmt(d.y)} Z`;
}

// Ponteiro: triângulo fino do pivô até perto da borda externa.
function ponteiro(f: number) {
  const ang = Math.PI * (1 - f);
  const ponta = ponto(f, R_OUT - 14);
  const perp = ang + Math.PI / 2;
  const base = 5;
  const b1 = { x: CX + base * Math.cos(perp), y: CY - base * Math.sin(perp) };
  const b2 = { x: CX - base * Math.cos(perp), y: CY + base * Math.sin(perp) };
  return `M ${fmt(b1.x)} ${fmt(b1.y)} L ${fmt(ponta.x)} ${fmt(ponta.y)} L ${fmt(b2.x)} ${fmt(b2.y)} Z`;
}

function GaugeMitigacao({ trimestres }: { trimestres: Trimestre[] | undefined }) {
  const { dica, mostrar, esconder } = useDica();
  const atual = trimestres && trimestres.length ? trimestres[trimestres.length - 1] : undefined;
  const pct = atual ? pctTrimestre(atual) : null;
  const fMeta = META / 100;
  const metaIn = ponto(fMeta, R_IN);
  const metaOut = ponto(fMeta, R_OUT + 8);
  // Triângulo da meta apontando para fora, na ponta da linha.
  const angMeta = Math.PI * (1 - fMeta);
  const metaPonta = ponto(fMeta, R_OUT + 16);
  const perpMeta = angMeta + Math.PI / 2;
  const metaT1 = { x: metaOut.x + 5 * Math.cos(perpMeta), y: metaOut.y - 5 * Math.sin(perpMeta) };
  const metaT2 = { x: metaOut.x - 5 * Math.cos(perpMeta), y: metaOut.y + 5 * Math.sin(perpMeta) };
  const metaRotulo = ponto(fMeta, R_OUT + 18);
  const marcas = [0, 25, 50, 75, 100];

  const rotulo = (
    <span className={s.dicaLista}>
      {(trimestres || []).map((t) => {
        const p = pctTrimestre(t);
        return (
          <span key={t.trimestre} className={s.dicaItem}>
            <span className={s.bullet} style={{ background: p === null ? COR_SEM_DADOS : corFaixa(p) }} aria-hidden="true" />
            Trimestre {t.trimestre}: {p === null ? "sem riscos no período" : `${formatPct(p)} (${t.mitigados} de ${t.total})`}
          </span>
        );
      })}
    </span>
  );

  return (
    <div className={s.card}>
      <h2 className={s.titulo}>Mitigação no trimestre</h2>
      <div
        className={s.centro}
        tabIndex={0}
        style={{ outline: "none", cursor: "default" }}
        onMouseMove={(e) => trimestres && mostrar(rotulo, e)}
        onMouseLeave={esconder}
        onFocus={(e) => trimestres && mostrar(rotulo, e)}
        onBlur={esconder}
      >
        <svg
          viewBox="0 0 270 140"
          className={s.gauge}
          role="img"
          aria-label={
            pct === null
              ? "Sem riscos críticos ou altos no trimestre atual"
              : `${formatPct(pct)} dos riscos críticos e altos (nível inerente) mitigados no trimestre ${atual?.trimestre}; meta de ${META}%`
          }
        >
          {ZONAS.map((z) => (
            <path key={z.de} d={setor(z.de / 100, z.ate / 100)} fill={z.cor} />
          ))}
          {marcas.map((m) => {
            const f = m / 100;
            const i = ponto(f, R_OUT - 6);
            const o = ponto(f, R_OUT + 4);
            const l = ponto(f, R_OUT + 16);
            const ancora = m === 0 ? "end" : m === 100 ? "start" : "middle";
            const dx = m === 0 ? 4 : m === 100 ? -4 : 0;
            return (
              <g key={m}>
                <line x1={i.x} y1={i.y} x2={o.x} y2={o.y} stroke="#1b2130" strokeWidth={2} strokeLinecap="round" />
                <text
                  x={l.x + dx}
                  y={m === 0 || m === 100 ? CY + 4 : l.y + 3}
                  textAnchor={ancora}
                  className={s.gaugeMarca}
                >
                  {m}%
                </text>
              </g>
            );
          })}
          <line x1={metaIn.x} y1={metaIn.y} x2={metaOut.x} y2={metaOut.y} stroke="#c0392b" strokeWidth={2} />
          <path
            d={`M ${fmt(metaT1.x)} ${fmt(metaT1.y)} L ${fmt(metaPonta.x)} ${fmt(metaPonta.y)} L ${fmt(metaT2.x)} ${fmt(metaT2.y)} Z`}
            fill="#c0392b"
          />
          <text x={metaRotulo.x + 8} y={metaRotulo.y - 3} className={s.gaugeMeta}>
            Meta
          </text>
          {pct !== null && (
            <path d={ponteiro(Math.min(Math.max(pct, 0), 100) / 100)} fill="#1b2130" />
          )}
          <circle cx={CX} cy={CY} r={7} fill="#1b2130" />
        </svg>
        <span className={s.gaugeValor}>{pct === null ? "—" : formatPct(pct)}</span>
        <p className={s.gaugeNota}>
          {atual
            ? pct === null
              ? `Trimestre ${atual.trimestre} · sem riscos críticos ou altos no período`
              : `Trimestre ${atual.trimestre} · ${atual.mitigados} de ${atual.total} críticos e altos (nível inerente) mitigados · meta ${META}%`
            : " "}
        </p>
      </div>
      <Tooltip dica={dica} />
    </div>
  );
}

export default function GraficosInicio({
  categorias,
  niveis,
  trimestres,
  totalAtivos,
}: {
  categorias: Categoria[];
  niveis: Nivel[];
  trimestres: Trimestre[] | undefined;
  totalAtivos: number;
}) {
  return (
    <section aria-label="Gráficos" className={s.linha}>
      <BarrasCategorias dados={categorias} totalAtivos={totalAtivos} />
      <PizzaCriticidade dados={niveis} />
      <GaugeMitigacao trimestres={trimestres} />
    </section>
  );
}
