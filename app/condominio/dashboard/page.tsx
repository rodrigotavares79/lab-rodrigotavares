"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import { donutSegments } from "@/lib/chartHelpers";

type Kpis = { total: number; em_aberto: number; sla_vencido: number; resolvidos: number };
type PorStatus = { status: string; total: number };
type PorUrgencia = { urgencia: string; total: number };
type PorServico = { servico: string; total: number };
type Recente = { id: number; titulo: string; status: string; urgencia: string | null; aberto_por_nome: string; criado_em: string };

type DashboardData = {
  kpis: Kpis;
  porStatus: PorStatus[];
  porUrgencia: PorUrgencia[];
  porServico: PorServico[];
  recentes: Recente[];
};

const CORES_STATUS: Record<string, string> = {
  "Novo": "var(--accent)",
  "Em andamento": "var(--warning)",
  "Aguardando fornecedor": "var(--warning)",
  "Paralisado": "var(--danger)",
  "Resolvido": "var(--success)",
  "Reaberto": "var(--danger)",
  "Cancelado": "#9db4c4",
};

function formatDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function CondominioDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/condominio-dashboard")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar o dashboard."))
      .finally(() => setCarregando(false));
  }, []);

  const kpis = data?.kpis;
  const porStatus = (data?.porStatus || []).map((s) => ({
    label: s.status,
    value: s.total,
    color: CORES_STATUS[s.status] || "#9db4c4",
  }));
  const donut = donutSegments(porStatus, 70);
  const porServico = data?.porServico || [];
  const servicoMax = Math.max(1, ...porServico.map((s) => s.total));

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Condomínio</span>
          <h1>Dashboard</h1>
          <p className="lede">Visão executiva dos chamados do condomínio.</p>

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

          {!carregando && !erro && kpis && (
            <div className="dashboard">
              <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                <div className="kpi-card">
                  <div className="kpi-card-header">Chamados Cadastrados</div>
                  <div className="kpi-card-value">{kpis.total}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-card-header">Em Aberto</div>
                  <div className="kpi-card-value">{kpis.em_aberto}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-card-header" style={{ background: "var(--danger)" }}>SLA Vencido</div>
                  <div className="kpi-card-value">{kpis.sla_vencido}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-card-header" style={{ background: "var(--success)" }}>Resolvidos</div>
                  <div className="kpi-card-value">{kpis.resolvidos}</div>
                </div>
              </div>

              <div className="dash-row-charts" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div className="dash-panel">
                  <div className="dash-panel-header">Chamados por Status</div>
                  <div className="dash-panel-body">
                    {donut.length === 0 ? (
                      <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>Sem dados suficientes.</p>
                    ) : (
                      <>
                        <svg viewBox="0 0 200 200" width="100%" style={{ maxWidth: "180px", display: "block", margin: "0 auto" }} role="img" aria-label="Distribuição de chamados por status">
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
                            <span key={d.label} style={{ fontSize: "0.78rem", color: "var(--text)" }}>
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
                  <div className="dash-panel-header">Chamados por Serviço</div>
                  <div className="dash-panel-body">
                    {porServico.length === 0 ? (
                      <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>Sem dados suficientes.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                        {porServico.map((s) => (
                          <div key={s.servico}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.2rem" }}>
                              <span>{s.servico}</span>
                              <span className="text-muted">{s.total}</span>
                            </div>
                            <div style={{ background: "var(--border)", borderRadius: "3px", height: "8px" }}>
                              <div style={{ width: `${(s.total / servicoMax) * 100}%`, background: "var(--accent)", height: "100%", borderRadius: "3px" }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="dash-panel">
                <div className="dash-panel-header">Chamados Recentes</div>
                <div className="dash-panel-body">
                  {(!data?.recentes || data.recentes.length === 0) ? (
                    <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>Nenhum chamado cadastrado ainda.</p>
                  ) : (
                    <table className="dash-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Título</th>
                          <th>Status</th>
                          <th>Aberto por</th>
                          <th>Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentes.map((r) => (
                          <tr key={r.id}>
                            <td>
                              <Link href={`/condominio/chamados/${r.id}`} style={{ color: "var(--accent)", fontWeight: 600 }}>
                                #{r.id}
                              </Link>
                            </td>
                            <td style={{ whiteSpace: "normal", minWidth: "14rem" }}>{r.titulo}</td>
                            <td>{r.status}</td>
                            <td>{r.aberto_por_nome}</td>
                            <td>{formatDataHora(r.criado_em)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          <a
            href="/condominio"
            className="status-tag"
            style={{ marginTop: "2.5rem", display: "inline-block" }}
          >
            ← Voltar para Gestão de Condomínio
          </a>
        </div>
      </section>
      <Footer />
    </>
  );
}
