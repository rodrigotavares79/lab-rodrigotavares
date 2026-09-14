"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Footer from "@/components/Footer";

type RiscoDetalhe = {
  id: number;
  projeto_id: number;
  projeto: string;
  categoria: string | null;
  gatilho: string | null;
  resultado_potencial: string | null;
  levantado_por: string;
  data_levantamento: string | null;
  fonte: string | null;
  impacto: number | null;
  probabilidade: number | null;
  matrix_score: number | null;
  nivel_inicial: string | null;
  impacto_qualitativo: string | null;
  status: string | null;
  sistema_critico_id: number | null;
  sistema_critico: string | null;
  duracao_horas: number | null;
  percentual_degradacao: number | null;
  restauracao_pessoas: number | null;
  restauracao_horas: number | null;
  impacto_critico_indisponibilidade: number | null;
  impacto_critico_restauracao: number | null;
  impacto_critico_total: number | null;
  impacto_alto_indisponibilidade: number | null;
  impacto_alto_restauracao: number | null;
  impacto_alto_total: number | null;
  criado_em: string;
};

type PlanoAcao = {
  id: number;
  risco_id: number;
  descricao: string;
  responsavel: string | null;
  prazo: string | null;
  status: string;
  criado_em: string;
};

const BADGE_POR_NIVEL: Record<string, string> = {
  "Baixo": "badge-baixo",
  "Médio": "badge-medio",
  "Alto": "badge-alto",
  "Crítico": "badge-critico",
};

function classeStatus(status: string | null): string {
  if (status === "Resolvido") return "status-resolved";
  if (status === "Identificado") return "status-identified";
  return "status-pending";
}

function classeStatusPlano(status: string): string {
  if (status === "Concluído") return "status-resolved";
  if (status === "Em andamento") return "status-identified";
  return "status-pending";
}

function formatData(iso: string | null): string {
  if (!iso) return "—";
  // colunas DATE podem vir do driver como "2026-08-24" ou como
  // "2026-08-24T00:00:00.000Z" (quando o driver as trata como Date) —
  // pegamos só os 10 primeiros caracteres (YYYY-MM-DD) em ambos os casos.
  const [ano, mes, dia] = String(iso).slice(0, 10).split("-");
  if (!ano || !mes || !dia) return String(iso);
  return `${dia}/${mes}/${ano}`;
}

function formatBRL(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_OPCOES = ["Identificado", "Em Tratamento", "Resolvido"];

function LinhaCampo({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr>
      <td style={{ color: "var(--text-muted)", width: "40%", whiteSpace: "normal" }}>{label}</td>
      <td style={{ fontWeight: 500, whiteSpace: "normal" }}>{value}</td>
    </tr>
  );
}

export default function DetalheDoRisco() {
  const params = useParams<{ id: string }>();
  const [risco, setRisco] = useState<RiscoDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [impactoForm, setImpactoForm] = useState("");
  const [probabilidadeForm, setProbabilidadeForm] = useState("");
  const [statusForm, setStatusForm] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [sucessoSalvar, setSucessoSalvar] = useState(false);

  function carregarRisco() {
    if (!params?.id) return;
    setCarregando(true);
    setErro(null);
    fetch(`/api/riscos/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setRisco(d.risco);
        setImpactoForm(d.risco.impacto ? String(d.risco.impacto) : "");
        setProbabilidadeForm(d.risco.probabilidade ? String(d.risco.probabilidade) : "");
        setStatusForm(d.risco.status || "Identificado");
      })
      .catch((e) => setErro(e.message || "Erro ao carregar o risco."))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregarRisco();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  async function handleReavaliar(e: React.FormEvent) {
    e.preventDefault();
    if (!risco) return;
    setSalvando(true);
    setErroSalvar(null);
    setSucessoSalvar(false);
    try {
      const res = await fetch(`/api/riscos/${risco.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          impacto: impactoForm ? Number(impactoForm) : undefined,
          probabilidade: probabilidadeForm ? Number(probabilidadeForm) : undefined,
          status: statusForm,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao salvar a reavaliação.");
      setSucessoSalvar(true);
      carregarRisco();
    } catch (err) {
      setErroSalvar(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }


  const [planos, setPlanos] = useState<PlanoAcao[]>([]);
  const [carregandoPlanos, setCarregandoPlanos] = useState(true);
  const [descricaoPlano, setDescricaoPlano] = useState("");
  const [responsavelPlano, setResponsavelPlano] = useState("");
  const [prazoPlano, setPrazoPlano] = useState("");
  const [salvandoPlano, setSalvandoPlano] = useState(false);
  const [erroPlano, setErroPlano] = useState<string | null>(null);

  function carregarPlanos() {
    if (!params?.id) return;
    setCarregandoPlanos(true);
    fetch(`/api/planos-acao?riscoId=${params.id}`)
      .then((r) => r.json())
      .then((d) => setPlanos(d.planos || []))
      .catch(() => setPlanos([]))
      .finally(() => setCarregandoPlanos(false));
  }

  useEffect(() => {
    carregarPlanos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  async function handleCadastrarPlano(e: React.FormEvent) {
    e.preventDefault();
    if (!risco) return;
    setSalvandoPlano(true);
    setErroPlano(null);
    try {
      const res = await fetch("/api/planos-acao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          riscoId: risco.id,
          descricao: descricaoPlano,
          responsavel: responsavelPlano || null,
          prazo: prazoPlano || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao cadastrar o plano de ação.");
      setDescricaoPlano("");
      setResponsavelPlano("");
      setPrazoPlano("");
      carregarPlanos();
    } catch (err) {
      setErroPlano(err instanceof Error ? err.message : "Erro ao cadastrar o plano de ação.");
    } finally {
      setSalvandoPlano(false);
    }
  }

  async function handleAtualizarStatusPlano(planoId: number, novoStatus: string) {
    try {
      const res = await fetch(`/api/planos-acao/${planoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao atualizar o plano de ação.");
      carregarPlanos();
    } catch (err) {
      setErroPlano(err instanceof Error ? err.message : "Erro ao atualizar o plano de ação.");
    }
  }


  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos</span>
          <div className="page-header-row">
            <h1>Detalhe do Risco {risco ? `#${risco.id}` : ""}</h1>
          </div>

          {carregando && <p className="text-muted" style={{ marginTop: "1.5rem" }}>Carregando...</p>}

          {erro && (
            <div className="error-banner" style={{ marginTop: "1.5rem" }}>
              <span className="success-icon error-icon">!</span>
              <span className="success-text">
                <strong>Não foi possível carregar este risco.</strong>
                <span>{erro}</span>
              </span>
            </div>
          )}

          {!carregando && !erro && risco && (
            <div className="dashboard" style={{ marginTop: "1.5rem" }}>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                {risco.impacto_qualitativo && (
                  <span className={`badge ${BADGE_POR_NIVEL[risco.impacto_qualitativo] || ""}`}>
                    Nível atual: {risco.impacto_qualitativo}
                  </span>
                )}
                <span className={classeStatus(risco.status)} style={{ fontSize: "0.85rem" }}>
                  Status: {risco.status || "Identificado"}
                </span>
              </div>

              <div className="dash-panel">
                <div className="dash-panel-header">Identificação</div>
                <div className="dash-panel-body">
                  <table className="dash-table">
                    <tbody>
                      <LinhaCampo label="Projeto" value={risco.projeto} />
                      <LinhaCampo label="Categoria do Risco" value={risco.categoria || "—"} />
                      <LinhaCampo label="Ponto de Gatilho" value={risco.gatilho || "—"} />
                      <LinhaCampo label="Resultado Potencial" value={risco.resultado_potencial || "—"} />
                      <LinhaCampo label="Levantado Por" value={risco.levantado_por} />
                      <LinhaCampo label="Data de Levantamento" value={formatData(risco.data_levantamento)} />
                      <LinhaCampo label="Fonte" value={risco.fonte || "—"} />
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="dash-panel">
                <div className="dash-panel-header">Análise de Impacto</div>
                <div className="dash-panel-body">
                  <table className="dash-table">
                    <tbody>
                      <LinhaCampo label="Impacto" value={risco.impacto ?? "—"} />
                      <LinhaCampo label="Probabilidade" value={risco.probabilidade ?? "—"} />
                      <LinhaCampo label="Pontuação da Matriz" value={risco.matrix_score ?? "—"} />
                      <LinhaCampo
                        label="Classificação (nível atual)"
                        value={risco.impacto_qualitativo || "—"}
                      />
                    </tbody>
                  </table>
                </div>
              </div>

              {risco.sistema_critico && (
                <div className="dash-panel">
                  <div className="dash-panel-header">Impacto Financeiro</div>
                  <div className="dash-panel-body">
                    <table className="dash-table">
                      <tbody>
                        <LinhaCampo label="Sistema Crítico" value={risco.sistema_critico} />
                        <LinhaCampo label="Duração (horas)" value={risco.duracao_horas ?? "—"} />
                        <LinhaCampo label="% Degradação" value={risco.percentual_degradacao ?? "—"} />
                        <LinhaCampo label="Pessoas na Restauração" value={risco.restauracao_pessoas ?? "—"} />
                        <LinhaCampo label="Horas de Restauração" value={risco.restauracao_horas ?? "—"} />
                        <LinhaCampo
                          label="Evento Crítico — Total"
                          value={formatBRL(risco.impacto_critico_total)}
                        />
                        <LinhaCampo
                          label="Alto Impacto (Degradação) — Total"
                          value={formatBRL(risco.impacto_alto_total)}
                        />
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="dash-panel">
                <div className="dash-panel-header">Nível do Risco</div>
                <div className="dash-panel-body">
                  <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
                    <div>
                      <div className="text-muted" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Nível inicial (na criação)
                      </div>
                      <div style={{ marginTop: "0.4rem" }}>
                        {risco.nivel_inicial ? (
                          <span className={`badge ${BADGE_POR_NIVEL[risco.nivel_inicial] || ""}`}>
                            {risco.nivel_inicial}
                          </span>
                        ) : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Nível atual
                      </div>
                      <div style={{ marginTop: "0.4rem" }}>
                        {risco.impacto_qualitativo ? (
                          <span className={`badge ${BADGE_POR_NIVEL[risco.impacto_qualitativo] || ""}`}>
                            {risco.impacto_qualitativo}
                          </span>
                        ) : "—"}
                      </div>
                    </div>
                  </div>

                  <p className="field-helper" style={{ marginTop: 0, marginBottom: "1rem" }}>
                    Depois de implementar uma medida de mitigação, reavalie impacto e/ou
                    probabilidade abaixo. O nível inicial não muda — ele fica registrado como
                    referência histórica de antes da mitigação.
                  </p>

                  <form onSubmit={handleReavaliar} className="form-grid" style={{ maxWidth: "30rem" }}>
                    <div className="form-field">
                      <label htmlFor="impactoForm">Impacto (1–5)</label>
                      <select id="impactoForm" value={impactoForm} onChange={(e) => setImpactoForm(e.target.value)}>
                        <option value="">—</option>
                        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div className="form-field">
                      <label htmlFor="probabilidadeForm">Probabilidade (1–5)</label>
                      <select id="probabilidadeForm" value={probabilidadeForm} onChange={(e) => setProbabilidadeForm(e.target.value)}>
                        <option value="">—</option>
                        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div className="form-field form-field-wide">
                      <label htmlFor="statusForm">Status</label>
                      <select id="statusForm" value={statusForm} onChange={(e) => setStatusForm(e.target.value)}>
                        {STATUS_OPCOES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="form-field-wide form-actions">
                      <button type="submit" className="btn-primary" disabled={salvando}>
                        {salvando ? "Salvando..." : "Salvar reavaliação"}
                      </button>
                      {sucessoSalvar && <span className="text-muted" style={{ fontSize: "0.85rem" }}>Reavaliação salva.</span>}
                    </div>
                    {erroSalvar && (
                      <div className="error-banner form-field-wide" style={{ marginTop: 0 }}>
                        <span className="success-icon error-icon">!</span>
                        <span className="success-text">{erroSalvar}</span>
                      </div>
                    )}
                  </form>
                </div>
              </div>

              <div className="dash-panel">
                <div className="dash-panel-header">Plano de Ação</div>
                <div className="dash-panel-body">
                  {carregandoPlanos && <p className="text-muted" style={{ fontSize: "0.85rem" }}>Carregando planos...</p>}

                  {!carregandoPlanos && planos.length === 0 && (
                    <p className="text-muted" style={{ fontSize: "0.85rem", marginTop: 0 }}>
                      Nenhum plano de ação cadastrado para este risco ainda.
                    </p>
                  )}

                  {!carregandoPlanos && planos.length > 0 && (
                    <div className="dash-table-scroll" style={{ marginBottom: "1.5rem" }}>
                      <table className="dash-table">
                        <thead>
                          <tr>
                            <th>Descrição</th>
                            <th>Responsável</th>
                            <th>Prazo</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {planos.map((p) => (
                            <tr key={p.id}>
                              <td style={{ whiteSpace: "normal", minWidth: "16rem" }}>{p.descricao}</td>
                              <td>{p.responsavel || "—"}</td>
                              <td>{formatData(p.prazo)}</td>
                              <td>
                                <select
                                  value={p.status}
                                  onChange={(e) => handleAtualizarStatusPlano(p.id, e.target.value)}
                                  className={classeStatusPlano(p.status)}
                                  style={{ fontSize: "0.8rem", border: "1px solid var(--border)", borderRadius: "3px", padding: "0.3rem 0.4rem", background: "var(--bg)" }}
                                >
                                  {["Não iniciado", "Em andamento", "Concluído"].map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <p style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.75rem" }}>
                    Novo plano de ação
                  </p>
                  <form onSubmit={handleCadastrarPlano} className="form-grid" style={{ maxWidth: "34rem" }}>
                    <div className="form-field form-field-wide">
                      <label htmlFor="descricaoPlano">Descrição</label>
                      <textarea
                        id="descricaoPlano"
                        value={descricaoPlano}
                        onChange={(e) => setDescricaoPlano(e.target.value)}
                        placeholder="Ex.: Implantar redundância de link de internet no site principal."
                        required
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="responsavelPlano">Responsável</label>
                      <input
                        id="responsavelPlano"
                        type="text"
                        value={responsavelPlano}
                        onChange={(e) => setResponsavelPlano(e.target.value)}
                        placeholder="Nome ou e-mail"
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="prazoPlano">Prazo</label>
                      <input
                        id="prazoPlano"
                        type="date"
                        value={prazoPlano}
                        onChange={(e) => setPrazoPlano(e.target.value)}
                      />
                    </div>
                    <div className="form-field-wide form-actions">
                      <button type="submit" className="btn-primary" disabled={salvandoPlano}>
                        {salvandoPlano ? "Salvando..." : "Adicionar plano de ação"}
                      </button>
                    </div>
                    {erroPlano && (
                      <div className="error-banner form-field-wide" style={{ marginTop: 0 }}>
                        <span className="success-icon error-icon">!</span>
                        <span className="success-text">{erroPlano}</span>
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </div>
          )}

          <a
            href="/seguranca/gestao-de-riscos/riscos"
            className="status-tag"
            style={{ marginTop: "2.5rem", display: "inline-block" }}
          >
            ← Voltar para Lista de Riscos
          </a>
        </div>
      </section>
      <Footer />
    </>
  );
}
