"use client";

import { useState, useEffect } from "react";
import Footer from "@/components/Footer";

type Projeto = { id: number; nome: string };
type Kpis = {
  total: number;
  mitigados: number;
  criticos_abertos: number;
  em_aberto: number;
  exposicao_critica: number;
  exposicao_alta: number;
};
type NivelRisco = { nivel: string; total: number };
type Categoria = { categoria: string; total: number };
type Evolucao = { mes: string; total: number };
type RankingItem = {
  id: number;
  projeto: string;
  categoria: string | null;
  gatilho: string | null;
  impacto_critico_total: number;
  impacto_alto_total: number;
};
type ConsolidadoItem = { projeto: string; total: number; criticos: number; exposicao: number };

type DashboardData = {
  kpis: Kpis;
  niveis: NivelRisco[];
  categorias: Categoria[];
  evolucao: Evolucao[];
  ranking: RankingItem[];
  consolidado: ConsolidadoItem[];
};

const CORES_NIVEL: Record<string, string> = {
  "Baixo": "#9db4c4",
  "Médio": "#b98900",
  "Alto": "#2b3a4a",
  "Crítico": "#a3242f",
};

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

/* ---------- Helpers de desenho SVG ---------- */

function linePath(values: number[], w: number, h: number, max: number) {
  const n = values.length;
  if (n === 0) return "";
  if (n === 1) return `M 0 ${h - (values[0] / max) * h} L ${w} ${h - (values[0] / max) * h}`;
  return values
    .map((v, i) => {
      const x = (i / (n - 1)) * w;
      const y = h - (v / max) * h;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function areaPath(values: number[], w: number, h: number, max: number) {
  const line = linePath(values, w, h, max);
  if (!line) return "";
  return `${line} L ${w} ${h} L 0 ${h} Z`;
}

function donutSegments(data: { label: string; value: number; color: string }[], r: number) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return [];
  const circumference = 2 * Math.PI * r;
  let cumulative = 0;
  return data.map((d) => {
    const fraction = d.value / total;
    const dash = fraction * circumference;
    const offset = -cumulative * circumference;
    cumulative += fraction;
    return { ...d, dash, gap: circumference - dash, offset, pct: (fraction * 100).toFixed(1) };
  });
}

export default function Dashboard() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [projetoId, setProjetoId] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projetos")
      .then((r) => r.json())
      .then((d) => setProjetos(d.projetos || []))
      .catch(() => setProjetos([]));
  }, []);

  useEffect(() => {
    setCarregando(true);
    setErro(null);
    const url = projetoId ? `/api/dashboard?projetoId=${projetoId}` : "/api/dashboard";
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar dashboard."))
      .finally(() => setCarregando(false));
  }, [projetoId]);

  const kpis = data?.kpis;
  const niveis = (data?.niveis || []).map((n) => ({
    label: n.nivel,
    value: n.total,
    color: CORES_NIVEL[n.nivel] || "#9db4c4",
  }));
  const categorias = data?.categorias || [];
  const evolucao = data?.evolucao || [];
  const ranking = data?.ranking || [];
  const consolidado = data?.consolidado || [];

  const donut = donutSegments(niveis, 70);

  const evoW = 600, evoH = 160;
  const evoMax = Math.max(1, ...evolucao.map((e) => e.total));
  const evoValores = evolucao.map((e) => e.total);

  const barW = 600, barH = 160;
  const catMax = Math.max(1, ...categorias.map((c) => c.total));
  const barGap = 14;
  const barWidth = categorias.length ? (barW - barGap * (categorias.length - 1)) / categorias.length : barW;

  const semDados = !carregando && !erro && kpis?.total === 0;

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos</span>
          <h1>Dashboard</h1>
          <p className="lede">
            Visão executiva com indicadores, gráficos e exposição financeira dos riscos cadastrados.
          </p>

          <div className="form-field" style={{ maxWidth: "20rem", marginTop: "1.5rem" }}>
            <label htmlFor="filtroProjeto">Projeto</label>
            <select
              id="filtroProjeto"
              value={projetoId}
              onChange={(e) => setProjetoId(e.target.value)}
            >
              <option value="">Todos os Projetos</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>

          {carregando && <p className="text-muted" style={{ marginTop: "2rem" }}>Carregando...</p>}

          {erro && (
            <div className="error-banner" style={{ marginTop: "2rem" }}>
              <span className="success-icon error-icon">!</span>
              <span className="success-text">
                <strong>Não foi possível carregar o dashboard.</strong>
                <span>{erro}</span>
              </span>
            </div>
          )}

          {semDados && (
            <div className="dash-panel" style={{ marginTop: "2rem" }}>
              <div className="dash-panel-body">
                <p className="text-muted" style={{ margin: 0 }}>
                  Nenhum risco cadastrado ainda {projetoId ? "para esse projeto" : ""}. Cadastre riscos na
                  página <a href="/seguranca/gestao-de-riscos/cadastro-de-riscos">Cadastro de Riscos</a> para
                  ver os indicadores aqui.
                </p>
              </div>
            </div>
          )}

          {!carregando && !erro && !semDados && kpis && (
            <div className="dashboard">
              {/* KPIs */}
              <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                <div className="kpi-card">
                  <div className="kpi-card-header">Riscos Cadastrados</div>
                  <div className="kpi-card-value">{kpis.total}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-card-header">Riscos Críticos Abertos</div>
                  <div className="kpi-card-value">{kpis.criticos_abertos}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-card-header">Riscos em Aberto (Identificado)</div>
                  <div className="kpi-card-value">{kpis.em_aberto}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-card-header">Exposição Financeira (Evento Crítico)</div>
                  <div className="kpi-card-value" style={{ fontSize: "1.5rem" }}>
                    {formatBRL(kpis.exposicao_critica)}
                  </div>
                </div>
              </div>

              {/* Gráficos */}
              <div className="dash-row-charts" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div className="dash-panel">
                  <div className="dash-panel-header">Riscos Cadastrados por Mês</div>
                  <div className="dash-panel-body">
                    {evolucao.length === 0 ? (
                      <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>Sem dados suficientes.</p>
                    ) : (
                      <svg viewBox={`0 0 ${evoW} ${evoH + 24}`} width="100%" role="img" aria-label="Riscos cadastrados por mês">
                        <path d={areaPath(evoValores, evoW, evoH, evoMax)} fill="#2b3a4a" opacity="0.12" />
                        <path d={linePath(evoValores, evoW, evoH, evoMax)} fill="none" stroke="#2b3a4a" strokeWidth="2" />
                        {evolucao.map((e, i) => {
                          const x = evolucao.length > 1 ? (i / (evolucao.length - 1)) * evoW : evoW / 2;
                          const y = evoH - (e.total / evoMax) * evoH;
                          return <circle key={e.mes} cx={x} cy={y} r="3" fill="#2b3a4a" />;
                        })}
                        {evolucao.map((e, i) => {
                          const x = evolucao.length > 1 ? (i / (evolucao.length - 1)) * evoW : evoW / 2;
                          return (
                            <text key={e.mes} x={x} y={evoH + 16} fontSize="9" fill="#6b6b66" textAnchor="middle">
                              {e.mes}
                            </text>
                          );
                        })}
                      </svg>
                    )}
                  </div>
                </div>

                <div className="dash-panel">
                  <div className="dash-panel-header">Riscos por Categoria</div>
                  <div className="dash-panel-body">
                    {categorias.length === 0 ? (
                      <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>Sem dados suficientes.</p>
                    ) : (
                      <svg viewBox={`0 0 ${barW} ${barH + 40}`} width="100%" role="img" aria-label="Riscos por categoria">
                        {categorias.map((c, i) => {
                          const x = i * (barWidth + barGap);
                          const h = (c.total / catMax) * barH;
                          const y = barH - h;
                          return (
                            <g key={c.categoria}>
                              <rect x={x} y={y} width={barWidth} height={h} fill="#2b3a4a" rx="2" />
                              <text x={x + barWidth / 2} y={y - 6} fontSize="10" fill="#1a1a18" textAnchor="middle">
                                {c.total}
                              </text>
                              <text x={x + barWidth / 2} y={barH + 14} fontSize="8" fill="#6b6b66" textAnchor="middle">
                                {c.categoria.length > 12 ? c.categoria.slice(0, 11) + "…" : c.categoria}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    )}
                  </div>
                </div>
              </div>

              <div className="dash-row-charts" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div className="dash-panel">
                  <div className="dash-panel-header">Níveis de Risco</div>
                  <div className="dash-panel-body">
                    {donut.length === 0 ? (
                      <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>Sem dados suficientes.</p>
                    ) : (
                      <>
                        <svg viewBox="0 0 200 200" width="100%" style={{ maxWidth: "180px", display: "block", margin: "0 auto" }} role="img" aria-label="Distribuição de níveis de risco">
                          <g transform="translate(100 100)">
                            {donut.map((d) => (
                              <circle
                                key={d.label}
                                r="70"
                                fill="none"
                                stroke={d.color}
                                strokeWidth="30"
                                strokeDasharray={`${d.dash} ${d.gap}`}
                                strokeDashoffset={d.offset}
                                transform="rotate(-90)"
                              />
                            ))}
                          </g>
                        </svg>
                        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                          {donut.map((d) => (
                            <span key={d.label} style={{ fontSize: "0.78rem", color: "#1a1a18" }}>
                              <span className="legend-dot" style={{ background: d.color }} />
                              {d.label} — {d.value} ({d.pct}%)
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="dash-panel">
                  <div className="dash-panel-header">Exposição Financeira — Alto Impacto (Degradação)</div>
                  <div className="dash-panel-body">
                    <div className="kpi-card-value" style={{ fontSize: "2rem" }}>
                      {formatBRL(kpis.exposicao_alta)}
                    </div>
                    <p className="text-muted" style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>
                      Soma do cenário de degradação parcial de todos os riscos vinculados a sistemas críticos
                      {projetoId ? " neste projeto" : ""}.
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabelas */}
              <div className="dash-panel">
                <div className="dash-panel-header">Riscos com Maior Exposição Financeira</div>
                <div className="dash-panel-body">
                  {ranking.length === 0 ? (
                    <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                      Nenhum risco com sistema crítico vinculado ainda.
                    </p>
                  ) : (
                    <table className="dash-table">
                      <thead>
                        <tr>
                          <th>Projeto</th>
                          <th>Categoria</th>
                          <th>Ponto de Gatilho</th>
                          <th>Evento Crítico</th>
                          <th>Alto Impacto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ranking.map((r) => (
                          <tr key={r.id}>
                            <td>{r.projeto}</td>
                            <td>{r.categoria || "—"}</td>
                            <td style={{ whiteSpace: "normal", minWidth: "16rem" }}>{r.gatilho || "—"}</td>
                            <td>{formatBRL(r.impacto_critico_total)}</td>
                            <td>{formatBRL(r.impacto_alto_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {!projetoId && (
                <div className="dash-panel">
                  <div className="dash-panel-header">Consolidado por Projeto</div>
                  <div className="dash-panel-body">
                    <table className="dash-table">
                      <thead>
                        <tr>
                          <th>Projeto</th>
                          <th>Riscos Cadastrados</th>
                          <th>Críticos</th>
                          <th>Exposição Financeira (Crítico)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {consolidado.map((c) => (
                          <tr key={c.projeto}>
                            <td>{c.projeto}</td>
                            <td>{c.total}</td>
                            <td>{c.criticos}</td>
                            <td>{formatBRL(c.exposicao)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <a
            href="/seguranca/gestao-de-riscos"
            className="status-tag"
            style={{ marginTop: "2.5rem", display: "inline-block" }}
          >
            ← Voltar para Gestão de Riscos
          </a>
        </div>
      </section>
      <Footer />
    </>
  );
}
