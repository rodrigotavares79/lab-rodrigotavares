"use client";

import { useState, useEffect, useMemo } from "react";
import Footer from "@/components/Footer";
import { SistemaIcone } from "@/lib/brandIcons";
import { linePath, areaPath, donutSegments } from "@/lib/chartHelpers";

type SistemaIA = {
  id: number;
  sistema: string;
  tipo: string | null;
  descricao: string | null;
  area: string | null;
  area_usuario: string | null;
  usuarios: string | null;
  emails: string | null;
  dados_tratados: string | null;
  parecer_aprovado: boolean | null;
  parecer_numero_chamado: string | null;
  criado_em: string;
};

const ACCENT = "var(--accent)";
const GRENA = "var(--grena)";
const CORES_STATUS = { aprovado: "var(--success)", naoAprovado: "var(--danger)", semParecer: "var(--text-muted)" };
const OPCOES_DADOS_TRATADOS = ["Pessoais", "Sensíveis", "Negócio"];
const MESES_LABEL = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function formatData(iso: string): string {
  const [ano, mes, dia] = String(iso).slice(0, 10).split("-");
  if (!ano || !mes || !dia) return String(iso);
  return `${dia}/${mes}/${ano}`;
}

// Todo sistema que trata dados Pessoais e/ou Sensíveis é sinalizado
// automaticamente — não depende de alguém marcar isso manualmente.
function requerAtencao(dadosTratados: string | null): boolean {
  const valor = dadosTratados || "";
  return valor.includes("Pessoais") || valor.includes("Sensíveis");
}

function ParecerCell({ sistema }: { sistema: SistemaIA }) {
  if (sistema.parecer_aprovado !== true) {
    return <span className="text-muted">{sistema.parecer_aprovado === false ? "Não aprovado" : "—"}</span>;
  }
  return <span>📎 {sistema.parecer_numero_chamado ? `#${sistema.parecer_numero_chamado}` : "Aprovado"}</span>;
}

function DadosTratadosCell({ sistema }: { sistema: SistemaIA }) {
  return (
    <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "0.3rem" }}>
      <span>{sistema.dados_tratados || "—"}</span>
      {requerAtencao(sistema.dados_tratados) && (
        <span className="badge badge-atencao">Requer atenção</span>
      )}
    </span>
  );
}

// Conta ocorrências por rótulo, preservando a ordem de `ordem` e agrupando
// o que não bate em "Não informado" no fim — mesmo tratamento em todos os
// gráficos de barra de série única.
function contarPorCampo(sistemas: SistemaIA[], campo: "tipo" | "area_usuario", ordem?: string[]): { label: string; total: number }[] {
  const contagem = new Map<string, number>();
  for (const s of sistemas) {
    const valor = s[campo] || "Não informado";
    contagem.set(valor, (contagem.get(valor) || 0) + 1);
  }
  const labels = ordem ? ordem.filter((l) => contagem.has(l)) : [...contagem.keys()];
  const resultado = labels.map((label) => ({ label, total: contagem.get(label)! }));
  if (contagem.has("Não informado") && !resultado.some((r) => r.label === "Não informado")) {
    resultado.push({ label: "Não informado", total: contagem.get("Não informado")! });
  }
  return resultado.sort((a, b) => b.total - a.total);
}

function BarChart({ dados, corBarra = ACCENT }: { dados: { label: string; total: number }[]; corBarra?: string }) {
  if (dados.length === 0) {
    return <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>Sem dados suficientes.</p>;
  }
  const w = 600, h = 160, topPad = 18, gap = 14;
  const max = Math.max(1, ...dados.map((d) => d.total));
  const barW = (w - gap * (dados.length - 1)) / dados.length;
  return (
    <svg viewBox={`0 0 ${w} ${h + topPad + 40}`} width="100%" role="img" aria-label="Gráfico de barras">
      {dados.map((d, i) => {
        const x = i * (barW + gap);
        const barH = (d.total / max) * h;
        const y = topPad + (h - barH);
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barW} height={barH} fill={corBarra} rx="2" />
            <text x={x + barW / 2} y={y - 6} fontSize="10" fill="var(--text)" textAnchor="middle">
              {d.total}
            </text>
            <text x={x + barW / 2} y={topPad + h + 14} fontSize="8" fill="var(--text-muted)" textAnchor="middle">
              {d.label.length > 14 ? d.label.slice(0, 13) + "…" : d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function GovernancaDeIADashboard() {
  const [sistemas, setSistemas] = useState<SistemaIA[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sistemas-ia")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setSistemas(d.sistemas || []);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar sistemas de IA."))
      .finally(() => setCarregando(false));
  }, []);

  const total = sistemas.length;
  const aprovados = sistemas.filter((s) => s.parecer_aprovado === true).length;
  const naoAprovados = sistemas.filter((s) => s.parecer_aprovado === false).length;
  const semParecer = sistemas.filter((s) => s.parecer_aprovado == null).length;

  const statusDonut = useMemo(
    () =>
      donutSegments(
        [
          { label: "Aprovado", value: aprovados, color: CORES_STATUS.aprovado },
          { label: "Não aprovado", value: naoAprovados, color: CORES_STATUS.naoAprovado },
          { label: "Sem parecer", value: semParecer, color: CORES_STATUS.semParecer },
        ],
        70
      ),
    [aprovados, naoAprovados, semParecer]
  );

  const porTipo = useMemo(() => contarPorCampo(sistemas, "tipo"), [sistemas]);
  const porAreaUsuario = useMemo(() => contarPorCampo(sistemas, "area_usuario"), [sistemas]);

  const porDadosTratados = useMemo(
    () =>
      OPCOES_DADOS_TRATADOS.map((opcao) => ({
        label: opcao,
        total: sistemas.filter((s) => (s.dados_tratados || "").includes(opcao)).length,
      })),
    [sistemas]
  );

  const evolucao = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const s of sistemas) {
      const chave = String(s.criado_em).slice(0, 7); // YYYY-MM
      contagem.set(chave, (contagem.get(chave) || 0) + 1);
    }
    return [...contagem.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([chave, total]) => {
        const [, mes] = chave.split("-");
        return { mes: MESES_LABEL[Number(mes) - 1] || chave, total };
      });
  }, [sistemas]);

  const evoW = 600, evoH = 160, evoTopPad = 16;
  const evoMax = Math.max(1, ...evolucao.map((e) => e.total));
  const evoValores = evolucao.map((e) => e.total);

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Governança de IA</span>
          <h1>Dashboard</h1>
          <p className="lede">
            Todos os sistemas de IA cadastrados no inventário.
          </p>

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

          {!carregando && !erro && total === 0 && (
            <div className="dash-panel" style={{ marginTop: "2rem" }}>
              <div className="dash-panel-body">
                <p className="text-muted" style={{ margin: 0 }}>
                  Nenhum sistema de IA cadastrado ainda. Cadastre na página{" "}
                  <a href="/seguranca/governanca-de-ia/inventario/cadastro">Cadastro de Sistema de IA</a>.
                </p>
              </div>
            </div>
          )}

          {!carregando && !erro && total > 0 && (
            <div className="dashboard">
              <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                <div className="kpi-card">
                  <div className="kpi-card-header">Sistemas Cadastrados</div>
                  <div className="kpi-card-value">{total}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-card-header">Aprovados por Cibersegurança</div>
                  <div className="kpi-card-value">{aprovados}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-card-header">Sem Parecer / Não Aprovados</div>
                  <div className="kpi-card-value">{semParecer + naoAprovados}</div>
                </div>
              </div>

              <div className="dash-row-charts" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div className="dash-panel">
                  <div className="dash-panel-header">Status de Aprovação</div>
                  <div className="dash-panel-body">
                    {statusDonut.length === 0 ? (
                      <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>Sem dados suficientes.</p>
                    ) : (
                      <>
                        <svg viewBox="0 0 200 200" width="100%" style={{ maxWidth: "180px", display: "block", margin: "0 auto" }} role="img" aria-label="Distribuição do status de aprovação de Cibersegurança">
                          <g transform="translate(100 100)">
                            {statusDonut.map((d) => (
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
                          {statusDonut.map((d) => (
                            <span key={d.label} style={{ fontSize: "0.78rem", color: "var(--text)" }}>
                              <span className="legend-dot" style={{ background: d.color }} />
                              {d.label === "Aprovado" ? "✓" : d.label === "Não aprovado" ? "✕" : "—"} {d.label} — {d.value} ({d.pct}%)
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="dash-panel">
                  <div className="dash-panel-header">Dados Tratados</div>
                  <div className="dash-panel-body">
                    <BarChart dados={porDadosTratados} />
                    <p className="text-muted" style={{ fontSize: "0.78rem", marginTop: "0.75rem", marginBottom: 0 }}>
                      Um sistema pode tratar mais de um tipo de dado — as barras não somam o total de sistemas.
                    </p>
                  </div>
                </div>
              </div>

              <div className="dash-row-charts" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div className="dash-panel">
                  <div className="dash-panel-header">Sistemas por Tipo</div>
                  <div className="dash-panel-body">
                    <BarChart dados={porTipo} />
                  </div>
                </div>

                <div className="dash-panel">
                  <div className="dash-panel-header">Sistemas por Área do Usuário</div>
                  <div className="dash-panel-body">
                    <BarChart dados={porAreaUsuario} />
                  </div>
                </div>
              </div>

              <div className="dash-panel">
                <div className="dash-panel-header">Sistemas Cadastrados por Mês</div>
                <div className="dash-panel-body">
                  {evolucao.length === 0 ? (
                    <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>Sem dados suficientes.</p>
                  ) : (
                    <svg
                      viewBox={`0 -${evoTopPad} ${evoW} ${evoH + evoTopPad + 24}`}
                      width="100%"
                      role="img"
                      aria-label="Sistemas de IA cadastrados por mês"
                    >
                      <path d={areaPath(evoValores, evoW, evoH, evoMax)} fill={GRENA} opacity="0.12" />
                      <path d={linePath(evoValores, evoW, evoH, evoMax)} fill="none" stroke={GRENA} strokeWidth="2" />
                      {evolucao.map((e, i) => {
                        const x = evolucao.length > 1 ? (i / (evolucao.length - 1)) * evoW : evoW / 2;
                        const y = evoH - (e.total / evoMax) * evoH;
                        const ancora = i === 0 ? "start" : i === evolucao.length - 1 ? "end" : "middle";
                        return (
                          <g key={i}>
                            <circle cx={x} cy={y} r="3" fill={GRENA} />
                            <text x={x} y={y - 8} fontSize="9" fontWeight="600" fill="var(--text)" textAnchor={ancora}>
                              {e.total}
                            </text>
                          </g>
                        );
                      })}
                      {evolucao.map((e, i) => {
                        const x = evolucao.length > 1 ? (i / (evolucao.length - 1)) * evoW : evoW / 2;
                        const ancora = i === 0 ? "start" : i === evolucao.length - 1 ? "end" : "middle";
                        return (
                          <text key={i} x={x} y={evoH + 16} fontSize="9" fill="var(--text-muted)" textAnchor={ancora}>
                            {e.mes}
                          </text>
                        );
                      })}
                    </svg>
                  )}
                </div>
              </div>

              <div className="dash-panel">
                <div className="dash-panel-header">
                  {total} sistema{total > 1 ? "s" : ""} de IA cadastrado{total > 1 ? "s" : ""}
                </div>
                <div className="dash-panel-body">
                  <div className="dash-table-scroll">
                    <table className="dash-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Sistema</th>
                          <th>Tipo</th>
                          <th>Área</th>
                          <th>Área do Usuário</th>
                          <th>Usuário(s)</th>
                          <th>E-mail(s)</th>
                          <th>Dados Tratados</th>
                          <th>Parecer Cibersegurança</th>
                          <th>Cadastrado em</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sistemas.map((s) => (
                          <tr key={s.id}>
                            <td>#{s.id}</td>
                            <td style={{ whiteSpace: "normal", minWidth: "10rem" }}>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                                <SistemaIcone nome={s.sistema} />
                                {s.sistema}
                              </span>
                            </td>
                            <td>{s.tipo || "—"}</td>
                            <td>{s.area || "—"}</td>
                            <td>{s.area_usuario || "—"}</td>
                            <td style={{ whiteSpace: "normal", minWidth: "10rem" }}>{s.usuarios || "—"}</td>
                            <td style={{ whiteSpace: "normal", minWidth: "12rem" }}>{s.emails || "—"}</td>
                            <td><DadosTratadosCell sistema={s} /></td>
                            <td><ParecerCell sistema={s} /></td>
                            <td>{formatData(s.criado_em)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          <a
            href="/seguranca/governanca-de-ia"
            className="status-tag"
            style={{ marginTop: "2.5rem", display: "inline-block" }}
          >
            ← Voltar para Governança de IA
          </a>
        </div>
      </section>
      <Footer />
    </>
  );
}
