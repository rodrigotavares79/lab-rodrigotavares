import Footer from "@/components/Footer";

/* ---------- Dados fictícios de demonstração ---------- */

const PROJETOS = ["Krei Tech", "Doofenshmirtz Evil Inc.", "McDuck Enterprises"] as const;

const kpis = [
  { label: "Riscos Cadastrados", value: 62 },
  { label: "Riscos Mitigados", value: 9 },
  { label: "Riscos Críticos não mitigados", value: 27 },
  { label: "Planos de Ação em aberto para mitigar riscos", value: 28 },
];

const evolucaoLabels = [
  "03/11", "10/11", "17/11", "24/11", "01/12", "08/12", "15/12",
  "22/12", "29/12", "05/01", "12/01", "19/01", "26/01", "02/02",
];
const cadastradosSerie = [3, 5, 4, 7, 6, 10, 8, 13, 9, 16, 11, 19, 14, 21];
const mitigadosSerie = [0, 1, 0, 1, 2, 1, 3, 2, 4, 3, 5, 4, 6, 5];

const novosRiscosLabels = ["2025-OUT", "2025-NOV", "2025-DEZ", "2026-JAN", "2026-FEV", "2026-MAR"];
const novosRiscosValores = [3, 4, 15, 9, 2, 7];

const niveisRisco = [
  { label: "Alto", value: 9, color: "#2b3a4a" },
  { label: "Médio", value: 14, color: "#b98900" },
  { label: "Muito Alto", value: 34, color: "#4a3b5c" },
  { label: "Muito Baixo", value: 5, color: "#9db4c4" },
];

const taxaMitigacaoGlobal = 14.5;

const consolidado = [
  { projeto: "Krei Tech", identificados: 28, planos: 25, semPlano: 3 },
  { projeto: "Doofenshmirtz Evil Inc.", identificados: 22, planos: 6, semPlano: 16 },
  { projeto: "McDuck Enterprises", identificados: 12, planos: 2, semPlano: 10 },
];

const mapaAreas = [
  { nivel: "Alto", valores: [4, 3, 2] },
  { nivel: "Médio", valores: [7, 5, 2] },
  { nivel: "Muito Alto", valores: [15, 13, 6] },
  { nivel: "Muito Baixo", valores: [2, 1, 2] },
];

const analitico = [
  { projeto: "Krei Tech", risco: "RSK-KT-01", plano: "Falha de autenticação no sistema de acesso remoto", responsavel: "Squad Segurança", status: "Identificado" },
  { projeto: "Krei Tech", risco: "RSK-KT-02", plano: "Servidor legado sem suporte do fabricante", responsavel: "Squad Infraestrutura", status: "Resolvido" },
  { projeto: "Krei Tech", risco: "RSK-KT-03", plano: "Ausência de MFA em aplicações críticas", responsavel: "Squad Segurança", status: "Identificado" },
  { projeto: "Krei Tech", risco: "RSK-KT-04", plano: "Monitoramento insuficiente de eventos de segurança", responsavel: "Squad Segurança", status: "Identificado" },
  { projeto: "Doofenshmirtz Evil Inc.", risco: "RSK-DEI-01", plano: "Backup não testado do ambiente de produção", responsavel: "Squad Infraestrutura", status: "Não Informado" },
  { projeto: "Doofenshmirtz Evil Inc.", risco: "RSK-DEI-02", plano: "Acesso privilegiado sem revisão periódica", responsavel: "A Definir", status: "Identificado" },
  { projeto: "Doofenshmirtz Evil Inc.", risco: "RSK-DEI-03", plano: "Rede sem segmentação adequada", responsavel: "Squad Infraestrutura", status: "Não Informado" },
  { projeto: "McDuck Enterprises", risco: "RSK-MCD-01", plano: "Dados sensíveis sem criptografia em trânsito", responsavel: "Squad Segurança", status: "Identificado" },
  { projeto: "McDuck Enterprises", risco: "RSK-MCD-02", plano: "Endpoint sem atualização de segurança", responsavel: "Squad Automação", status: "Resolvido" },
  { projeto: "McDuck Enterprises", risco: "RSK-MCD-03", plano: "Ausência de plano de continuidade de negócios", responsavel: "A Definir", status: "Não Informado" },
];

/* ---------- Helpers de desenho SVG (sem dependências externas) ---------- */

function linePath(values: number[], w: number, h: number, max: number) {
  const n = values.length;
  return values
    .map((v, i) => {
      const x = (i / (n - 1)) * w;
      const y = h - (v / max) * h;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function areaPath(values: number[], w: number, h: number, max: number) {
  return `${linePath(values, w, h, max)} L ${w} ${h} L 0 ${h} Z`;
}

function pointsOf(values: number[], w: number, h: number, max: number) {
  const n = values.length;
  return values.map((v, i) => ({
    x: (i / (n - 1)) * w,
    y: h - (v / max) * h,
  }));
}

function donutSegments(data: { label: string; value: number; color: string }[], r: number) {
  const total = data.reduce((s, d) => s + d.value, 0);
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

function statusClass(status: string) {
  if (status === "Identificado") return "status-identified";
  if (status === "Resolvido") return "status-resolved";
  return "status-pending";
}

/* ---------- Página ---------- */

export default function Dashboard() {
  const evoMax = 22;
  const evoW = 600;
  const evoH = 160;
  const cadastradosPts = pointsOf(cadastradosSerie, evoW, evoH, evoMax);
  const mitigadosPts = pointsOf(mitigadosSerie, evoW, evoH, evoMax);

  const barW = 600;
  const barH = 160;
  const barMax = 16;
  const barGap = 14;
  const barWidth = (barW - barGap * (novosRiscosValores.length - 1)) / novosRiscosValores.length;

  const donut = donutSegments(niveisRisco, 70);

  const gaugeR = 80;
  const gaugeCx = 100;
  const gaugeCy = 100;
  const halfCirc = Math.PI * gaugeR;
  const gaugeFilled = (taxaMitigacaoGlobal / 100) * halfCirc;
  const gaugePath = `M ${gaugeCx - gaugeR} ${gaugeCy} A ${gaugeR} ${gaugeR} 0 0 1 ${gaugeCx + gaugeR} ${gaugeCy}`;

  const totalIdentificados = consolidado.reduce((s, c) => s + c.identificados, 0);
  const totalPlanos = consolidado.reduce((s, c) => s + c.planos, 0);
  const totalSemPlano = consolidado.reduce((s, c) => s + c.semPlano, 0);
  const totalPorArea = PROJETOS.map((_, i) => mapaAreas.reduce((s, r) => s + r.valores[i], 0));

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos</span>
          <h1>Dashboard</h1>
          <p className="lede">
            Visão executiva com indicadores, gráficos e status dos riscos e
            planos de ação — dados fictícios para demonstração, ambiente
            Monstros S.A.
          </p>

          <div className="dashboard">
            {/* KPIs + evolução */}
            <div className="dash-row-top">
              <div className="kpi-grid">
                {kpis.map((k) => (
                  <div className="kpi-card" key={k.label}>
                    <div className="kpi-card-header">{k.label}</div>
                    <div className="kpi-card-value">{k.value}</div>
                  </div>
                ))}
              </div>

              <div className="dash-panel">
                <div className="dash-panel-header">
                  Evolução da Identificação e Mitigação de riscos no ambiente Monstros S.A.
                </div>
                <div className="dash-panel-body">
                  <div className="legend-row">
                    <span><span className="legend-dot" style={{ background: "#2b3a4a" }} />Riscos Cadastrados</span>
                    <span><span className="legend-dot" style={{ background: "#7c98ad" }} />Riscos Mitigados</span>
                  </div>
                  <svg viewBox={`0 0 ${evoW} ${evoH + 24}`} width="100%" role="img" aria-label="Evolução de riscos cadastrados e mitigados">
                    <path d={areaPath(cadastradosSerie, evoW, evoH, evoMax)} fill="#2b3a4a" opacity="0.12" />
                    <path d={linePath(cadastradosSerie, evoW, evoH, evoMax)} fill="none" stroke="#2b3a4a" strokeWidth="2" />
                    <path d={linePath(mitigadosSerie, evoW, evoH, evoMax)} fill="none" stroke="#7c98ad" strokeWidth="2" strokeDasharray="4 3" />
                    {mitigadosPts.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#7c98ad" />
                    ))}
                    {cadastradosPts.map((p, i) =>
                      i % 3 === 0 ? <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#2b3a4a" /> : null
                    )}
                    {evolucaoLabels.map((l, i) =>
                      i % 3 === 0 ? (
                        <text key={l} x={(i / (evolucaoLabels.length - 1)) * evoW} y={evoH + 16} fontSize="9" fill="#6b6b66" textAnchor="middle">
                          {l}
                        </text>
                      ) : null
                    )}
                  </svg>
                </div>
              </div>
            </div>

            {/* Bar + Pie + Gauge */}
            <div className="dash-row-charts">
              <div className="dash-panel">
                <div className="dash-panel-header">Novos riscos identificados nos últimos 6 meses</div>
                <div className="dash-panel-body">
                  <svg viewBox={`0 0 ${barW} ${barH + 26}`} width="100%" role="img" aria-label="Novos riscos identificados por mês">
                    {novosRiscosValores.map((v, i) => {
                      const x = i * (barWidth + barGap);
                      const h = (v / barMax) * barH;
                      const y = barH - h;
                      return (
                        <g key={i}>
                          <rect x={x} y={y} width={barWidth} height={h} fill="#2b3a4a" rx="2" />
                          <text x={x + barWidth / 2} y={y - 6} fontSize="10" fill="#1a1a18" textAnchor="middle">
                            {v}
                          </text>
                          <text x={x + barWidth / 2} y={barH + 16} fontSize="9" fill="#6b6b66" textAnchor="middle">
                            {novosRiscosLabels[i]}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              <div className="dash-panel">
                <div className="dash-panel-header">Níveis de riscos identificados</div>
                <div className="dash-panel-body">
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
                </div>
              </div>

              <div className="dash-panel">
                <div className="dash-panel-header">Taxa de Mitigação Global (%)</div>
                <div className="dash-panel-body">
                  <svg viewBox="0 0 200 110" width="100%" style={{ maxWidth: "220px", display: "block", margin: "0 auto" }} role="img" aria-label="Taxa de mitigação global">
                    <path d={gaugePath} fill="none" stroke="#e4e2dd" strokeWidth="16" />
                    <path
                      d={gaugePath}
                      fill="none"
                      stroke="#c1440e"
                      strokeWidth="16"
                      strokeDasharray={`${gaugeFilled} ${halfCirc - gaugeFilled}`}
                    />
                  </svg>
                  <div className="gauge-value">{taxaMitigacaoGlobal.toFixed(2)}%</div>
                </div>
              </div>
            </div>

            {/* Tabelas */}
            <div className="dash-row-tables">
              <div className="dash-panel">
                <div className="dash-panel-header">Riscos x Planos de Ação (Consolidado)</div>
                <div className="dash-panel-body">
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>Projeto</th>
                        <th>Riscos Identificados</th>
                        <th>Planos de Ação Cadastrados</th>
                        <th>Riscos sem Plano</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consolidado.map((c) => (
                        <tr key={c.projeto}>
                          <td>{c.projeto}</td>
                          <td>{c.identificados}</td>
                          <td>{c.planos}</td>
                          <td>{c.semPlano}</td>
                        </tr>
                      ))}
                      <tr className="total-row">
                        <td>Total</td>
                        <td>{totalIdentificados}</td>
                        <td>{totalPlanos}</td>
                        <td>{totalSemPlano}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="dash-panel">
                <div className="dash-panel-header">Mapa de Riscos Cadastrados por área</div>
                <div className="dash-panel-body">
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>Nível de Risco</th>
                        {PROJETOS.map((p) => (
                          <th key={p}>{p}</th>
                        ))}
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mapaAreas.map((r) => (
                        <tr key={r.nivel}>
                          <td>{r.nivel}</td>
                          {r.valores.map((v, i) => (
                            <td key={i}>{v}</td>
                          ))}
                          <td>{r.valores.reduce((s, v) => s + v, 0)}</td>
                        </tr>
                      ))}
                      <tr className="total-row">
                        <td>Total</td>
                        {totalPorArea.map((v, i) => (
                          <td key={i}>{v}</td>
                        ))}
                        <td>{totalPorArea.reduce((s, v) => s + v, 0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Analítico */}
            <div className="dash-panel">
              <div className="dash-panel-header">Riscos x Planos de Ação (Analítico)</div>
              <div className="dash-panel-body dash-table-scroll">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Projeto</th>
                      <th>Risco</th>
                      <th>Plano de Ação</th>
                      <th>Responsável</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analitico.map((a) => (
                      <tr key={a.risco}>
                        <td>{a.projeto}</td>
                        <td>{a.risco}</td>
                        <td style={{ whiteSpace: "normal", minWidth: "18rem" }}>{a.plano}</td>
                        <td>{a.responsavel}</td>
                        <td className={statusClass(a.status)}>{a.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

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
