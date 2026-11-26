"use client";

import { useState } from "react";

// B22 · Gráfico de linhas (SVG) para as tendências mensais: até 4 séries,
// linhas de 2 px, marcadores, legenda, rótulo direto no último ponto, mira +
// dica ao passar o mouse e alternativa em tabela. Mês sem foto vira lacuna.

export type Serie = { nome: string; cor: string; valores: (number | null)[]; tracejada?: boolean };

const L = 640;
const A = 220;
const M = { topo: 16, dir: 96, base: 28, esq: 36 };

export default function GraficoLinhas({
  titulo,
  meses,
  series,
  sufixo = "",
  maximo,
}: {
  titulo: string;
  meses: string[];
  series: Serie[];
  sufixo?: string;
  maximo?: number;
}) {
  const [foco, setFoco] = useState<number | null>(null);
  const [tabela, setTabela] = useState(false);
  const valores = series.flatMap((s) => s.valores.filter((v): v is number => v !== null));
  const temDados = valores.length > 0;
  const max = maximo ?? Math.max(4, ...valores);
  const passo = Math.max(1, Math.ceil(max / 4));
  const topoEscala = maximo ?? passo * 4;
  const w = L - M.esq - M.dir;
  const h = A - M.topo - M.base;
  const x = (i: number) => M.esq + (meses.length === 1 ? w / 2 : (i * w) / (meses.length - 1));
  const y = (v: number) => M.topo + h - (v / topoEscala) * h;
  const linhasGrade = [0, 1, 2, 3, 4].map((k) => (topoEscala * k) / 4);

  function caminho(vs: (number | null)[]) {
    let d = "";
    let aberto = false;
    vs.forEach((v, i) => {
      if (v === null) {
        aberto = false;
        return;
      }
      d += `${aberto ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      aberto = true;
    });
    return d;
  }

  return (
    <div className="dash-panel" style={{ margin: 0 }}>
      <div className="dash-panel-header" style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
        <span>{titulo}</span>
        <button
          type="button"
          onClick={() => setTabela(!tabela)}
          style={{ background: "none", border: 0, padding: 0, color: "var(--accent)", cursor: "pointer", font: "inherit", fontSize: "0.8rem" }}
        >
          {tabela ? "Ver gráfico" : "Ver tabela"}
        </button>
      </div>
      <div className="dash-panel-body">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.9rem", fontSize: "0.78rem", marginBottom: "0.4rem" }}>
          {series.map((s) => (
            <span key={s.nome} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <svg width="18" height="8" aria-hidden="true">
                <line x1="0" y1="4" x2="18" y2="4" stroke={s.cor} strokeWidth="2" strokeDasharray={s.tracejada ? "4 3" : undefined} />
              </svg>
              {s.nome}
            </span>
          ))}
        </div>

        {tabela ? (
          <div className="dash-table-scroll">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Mês</th>
                  {series.map((s) => (
                    <th key={s.nome}>{s.nome}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {meses.map((m, i) => (
                  <tr key={m}>
                    <td>{m}</td>
                    {series.map((s) => (
                      <td key={s.nome}>{s.valores[i] === null ? "—" : `${s.valores[i]}${sufixo}`}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !temDados ? (
          <p className="text-muted" style={{ margin: 0 }}>Sem fotos neste período.</p>
        ) : (
          <div style={{ position: "relative" }}>
            <svg viewBox={`0 0 ${L} ${A}`} width="100%" role="img" aria-label={titulo} onMouseLeave={() => setFoco(null)}>
              {linhasGrade.map((g) => (
                <g key={g}>
                  <line x1={M.esq} x2={L - M.dir} y1={y(g)} y2={y(g)} stroke="var(--border)" strokeWidth="1" />
                  <text x={M.esq - 6} y={y(g) + 4} textAnchor="end" fontSize="10" fill="var(--text-muted)">
                    {Math.round(g)}
                    {sufixo}
                  </text>
                </g>
              ))}
              {meses.map((m, i) => (
                <text key={m} x={x(i)} y={A - 8} textAnchor="middle" fontSize="10" fill="var(--text-muted)">
                  {m}
                </text>
              ))}
              {foco !== null && (
                <line x1={x(foco)} x2={x(foco)} y1={M.topo} y2={M.topo + h} stroke="var(--text-muted)" strokeWidth="1" strokeDasharray="3 3" />
              )}
              {series.map((s) => {
                const ultimo = s.valores.reduce<number | null>((u, v, i) => (v !== null ? i : u), null);
                return (
                  <g key={s.nome}>
                    <path d={caminho(s.valores)} fill="none" stroke={s.cor} strokeWidth="2" strokeLinejoin="round" strokeDasharray={s.tracejada ? "5 4" : undefined} />
                    {s.valores.map((v, i) =>
                      v === null ? null : (
                        <circle key={i} cx={x(i)} cy={y(v)} r={foco === i ? 5 : 4} fill={s.cor} stroke="var(--surface, #fff)" strokeWidth="2" />
                      )
                    )}
                    {ultimo !== null && (
                      <text x={x(ultimo) + 8} y={y(s.valores[ultimo] as number) + 4} fontSize="11" fill="var(--text)">
                        {s.valores[ultimo]}
                        {sufixo} {s.nome.length <= 12 ? s.nome : ""}
                      </text>
                    )}
                  </g>
                );
              })}
              {meses.map((m, i) => (
                <rect
                  key={m}
                  x={x(i) - (meses.length > 1 ? w / (meses.length - 1) / 2 : w / 2)}
                  y={M.topo}
                  width={meses.length > 1 ? w / (meses.length - 1) : w}
                  height={h}
                  fill="transparent"
                  onMouseEnter={() => setFoco(i)}
                />
              ))}
            </svg>
            {foco !== null && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: `${(x(foco) / L) * 100}%`,
                  transform: x(foco) > L * 0.6 ? "translateX(-105%)" : "translateX(8px)",
                  background: "var(--surface, #fff)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  padding: "0.4rem 0.6rem",
                  fontSize: "0.78rem",
                  pointerEvents: "none",
                  whiteSpace: "nowrap",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                }}
              >
                <strong>{meses[foco]}</strong>
                {series.map((s) => (
                  <div key={s.nome}>
                    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: s.cor, marginRight: 6 }} />
                    {s.nome}: {s.valores[foco] === null ? "sem foto" : `${s.valores[foco]}${sufixo}`}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
