"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Footer from "@/components/Footer";

type FatorRisco = {
  id: number;
  risco_id: number;
  codigo: string;
  descricao: string;
  explicacao: string | null;
  natureza: string;
  criticidade: string;
  controle_descricao: string;
  tipo_controle: string;
  natureza_controle: string;
  eficacia_potencial: string;
  status_implementacao: string;
  vetor_override: string | null;
  justificativa_override: string | null;
  criado_em: string;
};

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
  nivel_projetado: string | null;
  prob_nivel_atual: number | null;
  imp_nivel_atual: number | null;
  prob_nivel_projetado: number | null;
  imp_nivel_projetado: number | null;
  im_prob_atual: number | null;
  im_imp_atual: number | null;
  im_prob_projetado: number | null;
  im_imp_projetado: number | null;
  status: string | null;
  sistema_critico_id: number | null;
  sistema_critico: string | null;
  duracao_horas: number | null;
  duracao_horas_min: number | null;
  duracao_horas_max: number | null;
  percentual_degradacao: number | null;
  percentual_degradacao_min: number | null;
  percentual_degradacao_max: number | null;
  restauracao_pessoas: number | null;
  restauracao_pessoas_min: number | null;
  restauracao_pessoas_max: number | null;
  restauracao_horas: number | null;
  restauracao_horas_min: number | null;
  restauracao_horas_max: number | null;
  impacto_critico_indisponibilidade: number | null;
  impacto_critico_restauracao: number | null;
  impacto_critico_total: number | null;
  impacto_critico_p10: number | null;
  impacto_critico_p90: number | null;
  impacto_alto_indisponibilidade: number | null;
  impacto_alto_restauracao: number | null;
  impacto_alto_total: number | null;
  impacto_alto_p10: number | null;
  impacto_alto_p90: number | null;
  criado_em: string;
  fatores: FatorRisco[];
};

type Acao = {
  id: number;
  plano_acao_id: number;
  descricao: string;
  responsavel: string | null;
  prazo: string | null;
  status: string;
  criado_em: string;
};

type PlanoAcao = {
  id: number;
  risco_id: number;
  titulo: string;
  status: string;
  criado_em: string;
  acoes: Acao[];
};

const BADGE_POR_NIVEL: Record<string, string> = {
  "Baixo": "badge-baixo",
  "Moderado": "badge-medio",
  "Significativo": "badge-alto",
  "Alto": "badge-critico",
};

const OPCOES_NATUREZA_FATOR = ["Exposição", "Amplificação", "Misto"];
const OPCOES_CRITICIDADE = ["Muito Alta", "Alta", "Média", "Baixa", "Muito Baixa"];
const OPCOES_TIPO_CONTROLE = ["Preventivo", "Detectivo", "Corretivo", "Diretivo / Governança"];
const OPCOES_NATUREZA_CONTROLE = ["Técnico automatizado", "Técnico com intervenção manual", "Processo / Manual"];
const OPCOES_EFICACIA_POTENCIAL = ["Alta", "Média", "Baixa", "Inexistente"];
const OPCOES_STATUS_IMPLEMENTACAO = [
  "Não iniciado",
  "Planejado / Em desenho",
  "Em implementação",
  "Implementado — pendente de validação",
  "Implementado e validado",
];
const OPCOES_VETOR = ["Probabilidade", "Impacto", "Ambos"];
const STATUS_OPCOES = ["Identificado", "Em Tratamento", "Mitigado"];

function classeStatus(status: string | null): string {
  if (status === "Mitigado") return "status-resolved";
  if (status === "Identificado") return "status-identified";
  return "status-pending";
}

function classeStatusPlano(status: string): string {
  if (status === "Concluído") return "status-resolved";
  return "status-pending";
}

function classeStatusAcao(status: string): string {
  if (status === "Concluído") return "status-resolved";
  if (status === "Em andamento") return "status-identified";
  return "status-pending";
}

function formatData(iso: string | null): string {
  if (!iso) return "—";
  const [ano, mes, dia] = String(iso).slice(0, 10).split("-");
  if (!ano || !mes || !dia) return String(iso);
  return `${dia}/${mes}/${ano}`;
}

function formatBRL(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPct(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `${(value * 100).toFixed(0)}%`;
}

// Mostra "valor (mín–máx)" quando o risco foi cadastrado com faixa de
// incerteza; riscos antigos (cadastrados antes da simulação Monte Carlo)
// não têm min/max gravados e caem no valor único de sempre.
function valorComFaixa(valor: number | null, min: number | null, max: number | null): React.ReactNode {
  if (valor === null || valor === undefined) return "—";
  if (min === null || max === null || min === max) return valor;
  return (
    <>
      {valor} <span style={{ color: "var(--text-muted)", fontSize: "0.85em" }}>({min}–{max})</span>
    </>
  );
}

function formatBRLComFaixa(total: number | null, p10: number | null, p90: number | null): React.ReactNode {
  if (total === null || total === undefined) return "—";
  if (p10 === null || p90 === null) return formatBRL(total);
  return (
    <>
      {formatBRL(total)}{" "}
      <span style={{ color: "var(--text-muted)", fontSize: "0.85em" }}>
        (faixa p10–p90: {formatBRL(p10)} a {formatBRL(p90)})
      </span>
    </>
  );
}

function acaoVencida(prazo: string | null, status: string): boolean {
  if (!prazo || status === "Concluído") return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataPrazo = new Date(String(prazo).slice(0, 10) + "T00:00:00");
  return dataPrazo < hoje;
}

function LinhaCampo({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr>
      <td style={{ color: "var(--text-muted)", width: "40%", whiteSpace: "normal" }}>{label}</td>
      <td style={{ fontWeight: 500, whiteSpace: "normal" }}>{value}</td>
    </tr>
  );
}

/* ---------- Card de um Fator de Risco ---------- */

function FatorRiscoCard({
  fator,
  riscoMitigado,
  onAtualizado,
}: {
  fator: FatorRisco;
  riscoMitigado: boolean;
  onAtualizado: () => void;
}) {
  const [salvandoStatus, setSalvandoStatus] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleStatusChange(novoStatus: string) {
    setSalvandoStatus(true);
    setErro(null);
    try {
      const res = await fetch(`/api/fatores-risco/${fator.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusImplementacao: novoStatus }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao atualizar o status.");
      onAtualizado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao atualizar.");
    } finally {
      setSalvandoStatus(false);
    }
  }

  async function handleRemover() {
    if (!confirm(`Remover o fator ${fator.codigo}? Essa ação não pode ser desfeita.`)) return;
    try {
      const res = await fetch(`/api/fatores-risco/${fator.id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao remover o fator.");
      onAtualizado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao remover.");
    }
  }

  return (
    <div className="dash-panel" style={{ marginBottom: "1rem" }}>
      <div className="dash-panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
        <span>{fator.codigo} — {fator.descricao}</span>
        {!riscoMitigado && (
          <button
            type="button"
            onClick={handleRemover}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.8)", cursor: "pointer", fontSize: "0.75rem" }}
          >
            Remover
          </button>
        )}
      </div>
      <div className="dash-panel-body">
        <table className="dash-table" style={{ marginBottom: "1rem" }}>
          <tbody>
            <label className="label-com-ajuda">
  Natureza do Fator
  <span className="info-icon" tabIndex={0}>
    i
    <span className="info-tooltip">
      <strong>Exposição</strong>: facilita o risco acontecer (não muda o tamanho do estrago).{" "}
      <strong>Amplificação</strong>: não muda a chance, mas piora as consequências se acontecer.{" "}
      <strong>Misto</strong>: faz as duas coisas ao mesmo tempo.
    </span>
  </span>
</label>
            <LinhaCampo label="Criticidade" value={fator.criticidade} />
            <LinhaCampo label="Controle / Ação Recomendada" value={fator.controle_descricao} />
            <LinhaCampo label="Tipo de Controle" value={fator.tipo_controle} />
            <LinhaCampo label="Natureza do Controle" value={fator.natureza_controle} />
            <LinhaCampo label="Eficácia Potencial" value={fator.eficacia_potencial} />
            {fator.vetor_override && (
              <LinhaCampo label="Vetor (override)" value={`${fator.vetor_override} — ${fator.justificativa_override || ""}`} />
            )}
          </tbody>
        </table>

        <div className="form-field" style={{ maxWidth: "22rem" }}>
          <label>Status de Implementação</label>
          <select
            value={fator.status_implementacao}
            disabled={riscoMitigado || salvandoStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            {OPCOES_STATUS_IMPLEMENTACAO.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        {erro && (
          <div className="error-banner" style={{ marginTop: "0.75rem" }}>
            <span className="success-icon error-icon">!</span>
            <span className="success-text">{erro}</span>
          </div>
        )}
      </div>
    </div>
  );
}
/* ---------- Formulário de novo Fator de Risco ---------- */

function NovoFatorForm({ riscoId, onCriado }: { riscoId: number; onCriado: () => void }) {
  const [descricao, setDescricao] = useState("");
  const [explicacao, setExplicacao] = useState("");
  const [natureza, setNatureza] = useState(OPCOES_NATUREZA_FATOR[0]);
  const [criticidade, setCriticidade] = useState(OPCOES_CRITICIDADE[2]);
  const [controleDescricao, setControleDescricao] = useState("");
  const [tipoControle, setTipoControle] = useState(OPCOES_TIPO_CONTROLE[0]);
  const [naturezaControle, setNaturezaControle] = useState(OPCOES_NATUREZA_CONTROLE[0]);
  const [eficaciaPotencial, setEficaciaPotencial] = useState(OPCOES_EFICACIA_POTENCIAL[0]);
  const [statusImplementacao, setStatusImplementacao] = useState(OPCOES_STATUS_IMPLEMENTACAO[0]);
  const [vetorOverride, setVetorOverride] = useState("");
  const [justificativaOverride, setJustificativaOverride] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch("/api/fatores-risco", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          riscoId,
          descricao,
          explicacao: explicacao || null,
          natureza,
          criticidade,
          controleDescricao,
          tipoControle,
          naturezaControle,
          eficaciaPotencial,
          statusImplementacao,
          vetorOverride: vetorOverride || null,
          justificativaOverride: justificativaOverride || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao cadastrar o fator de risco.");
      setDescricao("");
      setExplicacao("");
      setControleDescricao("");
      setVetorOverride("");
      setJustificativaOverride("");
      setStatusImplementacao(OPCOES_STATUS_IMPLEMENTACAO[0]);
      onCriado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao cadastrar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-grid" style={{ maxWidth: "40rem" }}>
      <div className="form-field form-field-wide">
        <label>Descrição do Fator (vulnerabilidade / causa)</label>
        <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} required
          placeholder="Ex.: Política DMARC em modo de observação, sem bloqueio." />
      </div>
      <div className="form-field form-field-wide">
        <label>Explicação (opcional)</label>
        <textarea value={explicacao} onChange={(e) => setExplicacao(e.target.value)}
          placeholder="Detalhamento técnico do fator, se necessário." />
      </div>
      <div className="form-field">
        <label>Natureza do Fator</label>
        <select value={natureza} onChange={(e) => setNatureza(e.target.value)}>
          {OPCOES_NATUREZA_FATOR.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div className="form-field">
        <label>Criticidade do Fator</label>
        <select value={criticidade} onChange={(e) => setCriticidade(e.target.value)}>
          {OPCOES_CRITICIDADE.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div className="form-field form-field-wide">
        <label>Controle / Ação Recomendada</label>
        <textarea value={controleDescricao} onChange={(e) => setControleDescricao(e.target.value)} required
          placeholder="Ex.: Evolução controlada de p=none para quarantine/reject." />
      </div>
      <div className="form-field">
        <label>Tipo de Controle</label>
        <select value={tipoControle} onChange={(e) => setTipoControle(e.target.value)}>
          {OPCOES_TIPO_CONTROLE.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div className="form-field">
        <label>Natureza do Controle</label>
        <select value={naturezaControle} onChange={(e) => setNaturezaControle(e.target.value)}>
          {OPCOES_NATUREZA_CONTROLE.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div className="form-field">
        <label>Eficácia Potencial</label>
        <select value={eficaciaPotencial} onChange={(e) => setEficaciaPotencial(e.target.value)}>
          {OPCOES_EFICACIA_POTENCIAL.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div className="form-field">
        <label>Status de Implementação</label>
        <select value={statusImplementacao} onChange={(e) => setStatusImplementacao(e.target.value)}>
          {OPCOES_STATUS_IMPLEMENTACAO.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div className="form-field">
        <label>Vetor — Override (opcional)</label>
        <select value={vetorOverride} onChange={(e) => setVetorOverride(e.target.value)}>
          <option value="">— usar vetor sugerido —</option>
          {OPCOES_VETOR.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      {vetorOverride && (
        <div className="form-field form-field-wide">
          <label>Justificativa do Override (obrigatória)</label>
          <textarea value={justificativaOverride} onChange={(e) => setJustificativaOverride(e.target.value)} required />
        </div>
      )}
      <div className="form-field-wide form-actions">
        <button type="submit" className="btn-primary" disabled={salvando}>
          {salvando ? "Salvando..." : "Adicionar fator de risco"}
        </button>
      </div>
      {erro && (
        <div className="error-banner form-field-wide" style={{ marginTop: 0 }}>
          <span className="success-icon error-icon">!</span>
          <span className="success-text">{erro}</span>
        </div>
      )}
    </form>
  );
}
/* ---------- Card de um Plano de Ação, com suas Ações dentro ---------- */

function PlanoAcaoCard({
  plano,
  riscoMitigado,
  onAtualizado,
}: {
  plano: PlanoAcao;
  riscoMitigado: boolean;
  onAtualizado: () => void;
}) {
  const [descricaoAcao, setDescricaoAcao] = useState("");
  const [responsavelAcao, setResponsavelAcao] = useState("");
  const [prazoAcao, setPrazoAcao] = useState("");
  const [salvandoAcao, setSalvandoAcao] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [concluindo, setConcluindo] = useState(false);
  const [erroConcluir, setErroConcluir] = useState<string | null>(null);

  const planoAberto = plano.status !== "Concluído";
  const podeAdicionarAcao = planoAberto && !riscoMitigado;
  const todasConcluidas = plano.acoes.length > 0 && plano.acoes.every((a) => a.status === "Concluído");
  const podeConcluirPlano = planoAberto && !riscoMitigado && todasConcluidas;

  async function handleAdicionarAcao(e: React.FormEvent) {
    e.preventDefault();
    setSalvandoAcao(true);
    setErroAcao(null);
    try {
      const res = await fetch("/api/acoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planoAcaoId: plano.id,
          descricao: descricaoAcao,
          responsavel: responsavelAcao || null,
          prazo: prazoAcao || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao cadastrar a ação.");
      setDescricaoAcao("");
      setResponsavelAcao("");
      setPrazoAcao("");
      onAtualizado();
    } catch (err) {
      setErroAcao(err instanceof Error ? err.message : "Erro ao cadastrar a ação.");
    } finally {
      setSalvandoAcao(false);
    }
  }

  async function handleAtualizarStatusAcao(acaoId: number, novoStatus: string) {
    try {
      const res = await fetch(`/api/acoes/${acaoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao atualizar a ação.");
      onAtualizado();
    } catch (err) {
      setErroAcao(err instanceof Error ? err.message : "Erro ao atualizar a ação.");
    }
  }

  async function handleConcluirPlano() {
    setConcluindo(true);
    setErroConcluir(null);
    try {
      const res = await fetch(`/api/planos-acao/${plano.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Concluído" }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao concluir o plano de ação.");
      onAtualizado();
    } catch (err) {
      setErroConcluir(err instanceof Error ? err.message : "Erro ao concluir o plano de ação.");
    } finally {
      setConcluindo(false);
    }
  }

  return (
    <div className="dash-panel" style={{ marginBottom: "1rem" }}>
      <div
        className="dash-panel-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}
      >
        <span>{plano.titulo}</span>
        <span
          className={classeStatusPlano(plano.status)}
          style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.04em", background: "rgba(255,255,255,0.15)", padding: "0.15rem 0.5rem", borderRadius: "3px", color: "#fff" }}
        >
          {plano.status}
        </span>
      </div>
      <div className="dash-panel-body">
        {plano.acoes.length === 0 ? (
          <p className="text-muted" style={{ fontSize: "0.85rem", marginTop: 0 }}>
            Nenhuma ação cadastrada neste plano ainda.
          </p>
        ) : (
          <div className="dash-table-scroll" style={{ marginBottom: "1.25rem" }}>
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
                {plano.acoes.map((a) => (
                  <tr key={a.id}>
                    <td style={{ whiteSpace: "normal", minWidth: "14rem" }}>{a.descricao}</td>
                    <td>{a.responsavel || "—"}</td>
                    <td>
                      {formatData(a.prazo)}
                      {acaoVencida(a.prazo, a.status) && (
                        <span className="report-vencida" style={{ marginLeft: "0.4rem", fontSize: "0.72rem" }}>
                          ⚠ Vencida
                        </span>
                      )}
                    </td>
                    <td>
                      <select
                        value={a.status}
                        disabled={riscoMitigado}
                        onChange={(e) => handleAtualizarStatusAcao(a.id, e.target.value)}
                        className={classeStatusAcao(a.status)}
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

        {riscoMitigado && (
          <p className="field-helper" style={{ margin: 0 }}>
            Este risco foi mitigado — este plano está congelado e não pode mais ser alterado.
          </p>
        )}

        {!riscoMitigado && !planoAberto && (
          <p className="field-helper" style={{ margin: 0 }}>
            Plano concluído — não é possível cadastrar novas ações nele.
          </p>
        )}

        {podeAdicionarAcao && (
          <>
            <p style={{ fontSize: "0.8rem", fontWeight: 600, marginTop: "0.5rem", marginBottom: "0.75rem" }}>
              Nova ação
            </p>
            <form onSubmit={handleAdicionarAcao} className="form-grid" style={{ maxWidth: "32rem" }}>
              <div className="form-field form-field-wide">
                <label>Descrição</label>
                <textarea
                  value={descricaoAcao}
                  onChange={(e) => setDescricaoAcao(e.target.value)}
                  placeholder="Ex.: Contratar link redundante com operadora alternativa."
                  required
                />
              </div>
              <div className="form-field">
                <label>Responsável</label>
                <input
                  type="text"
                  value={responsavelAcao}
                  onChange={(e) => setResponsavelAcao(e.target.value)}
                  placeholder="Nome ou e-mail"
                />
              </div>
              <div className="form-field">
                <label>Prazo</label>
                <input type="date" value={prazoAcao} onChange={(e) => setPrazoAcao(e.target.value)} />
              </div>
              <div className="form-field-wide form-actions">
                <button type="submit" className="btn-primary" disabled={salvandoAcao}>
                  {salvandoAcao ? "Salvando..." : "Adicionar ação"}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleConcluirPlano}
                  disabled={!podeConcluirPlano || concluindo}
                  title={!todasConcluidas ? "Todas as ações precisam estar concluídas" : ""}
                  style={{ background: "var(--text-muted)" }}
                >
                  {concluindo ? "Concluindo..." : "Concluir plano de ação"}
                </button>
              </div>
              {erroAcao && (
                <div className="error-banner form-field-wide" style={{ marginTop: 0 }}>
                  <span className="success-icon error-icon">!</span>
                  <span className="success-text">{erroAcao}</span>
                </div>
              )}
              {erroConcluir && (
                <div className="error-banner form-field-wide" style={{ marginTop: 0 }}>
                  <span className="success-icon error-icon">!</span>
                  <span className="success-text">{erroConcluir}</span>
                </div>
              )}
            </form>
          </>
        )}
      </div>
    </div>
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
      if (!res.ok) throw new Error(body.error || "Falha ao salvar.");
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
  const [tituloPlano, setTituloPlano] = useState("");
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
        body: JSON.stringify({ riscoId: risco.id, titulo: tituloPlano }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao cadastrar o plano de ação.");
      setTituloPlano("");
      carregarPlanos();
    } catch (err) {
      setErroPlano(err instanceof Error ? err.message : "Erro ao cadastrar o plano de ação.");
    } finally {
      setSalvandoPlano(false);
    }
  }

  const riscoMitigado = risco?.status === "Mitigado";

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

              {risco.sistema_critico && (
                <div className="dash-panel">
                  <div className="dash-panel-header">Impacto Financeiro</div>
                  <div className="dash-panel-body">
                    <table className="dash-table">
                      <tbody>
                        <LinhaCampo label="Sistema Crítico" value={risco.sistema_critico} />
                        <LinhaCampo label="Duração (horas)" value={valorComFaixa(risco.duracao_horas, risco.duracao_horas_min, risco.duracao_horas_max)} />
                        <LinhaCampo label="% Degradação" value={valorComFaixa(risco.percentual_degradacao, risco.percentual_degradacao_min, risco.percentual_degradacao_max)} />
                        <LinhaCampo label="Pessoas na Restauração" value={valorComFaixa(risco.restauracao_pessoas, risco.restauracao_pessoas_min, risco.restauracao_pessoas_max)} />
                        <LinhaCampo label="Horas de Restauração" value={valorComFaixa(risco.restauracao_horas, risco.restauracao_horas_min, risco.restauracao_horas_max)} />
                        <LinhaCampo
                          label="Evento Crítico — Total (mediana)"
                          value={formatBRLComFaixa(risco.impacto_critico_total, risco.impacto_critico_p10, risco.impacto_critico_p90)}
                        />
                        <LinhaCampo
                          label="Alto Impacto (Degradação) — Total (mediana)"
                          value={formatBRLComFaixa(risco.impacto_alto_total, risco.impacto_alto_p10, risco.impacto_alto_p90)}
                        />
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="dash-panel">
                <div className="dash-panel-header">Nível do Risco — Inerente / Atual / Projetado</div>
                <div className="dash-panel-body">
                  <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
                    <div>
                      <div className="text-muted" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Inerente (sem controles)
                      </div>
                      <div style={{ marginTop: "0.4rem" }}>
                        {risco.nivel_inicial ? (
                          <span className={`badge ${BADGE_POR_NIVEL[risco.nivel_inicial] || ""}`}>{risco.nivel_inicial}</span>
                        ) : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Atual (controles hoje)
                      </div>
                      <div style={{ marginTop: "0.4rem" }}>
                        {risco.impacto_qualitativo ? (
                          <span className={`badge ${BADGE_POR_NIVEL[risco.impacto_qualitativo] || ""}`}>{risco.impacto_qualitativo}</span>
                        ) : "—"}
                      </div>
                      <div className="text-muted" style={{ fontSize: "0.72rem", marginTop: "0.3rem" }}>
                        IM Prob. {formatPct(risco.im_prob_atual)} · IM Imp. {formatPct(risco.im_imp_atual)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Projetado (planos concluídos)
                      </div>
                      <div style={{ marginTop: "0.4rem" }}>
                        {risco.nivel_projetado ? (
                          <span className={`badge ${BADGE_POR_NIVEL[risco.nivel_projetado] || ""}`}>{risco.nivel_projetado}</span>
                        ) : "—"}
                      </div>
                      <div className="text-muted" style={{ fontSize: "0.72rem", marginTop: "0.3rem" }}>
                        IM Prob. {formatPct(risco.im_prob_projetado)} · IM Imp. {formatPct(risco.im_imp_projetado)}
                      </div>
                    </div>
                  </div>

                  {riscoMitigado ? (
                    <div className="field-helper" style={{ margin: 0 }}>
                      Este risco foi mitigado e não pode mais ser alterado.
                    </div>
                  ) : (
                    <>
                      <p className="field-helper" style={{ marginTop: 0, marginBottom: "1rem" }}>
                        Impacto e Probabilidade abaixo são os valores <strong>inerentes</strong> (antes de
                        qualquer controle). O nível Atual e o Projetado são sempre calculados a partir dos
                        Fatores de Risco cadastrados mais abaixo — não são digitados aqui. Ao marcar o
                        status como <strong>Mitigado</strong>, o risco é congelado por completo.
                      </p>

                      <form onSubmit={handleReavaliar} className="form-grid" style={{ maxWidth: "30rem" }}>
                        <div className="form-field">
                          <label htmlFor="impactoForm">Impacto Inerente (1–5)</label>
                          <select id="impactoForm" value={impactoForm} onChange={(e) => setImpactoForm(e.target.value)}>
                            <option value="">—</option>
                            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                        <div className="form-field">
                          <label htmlFor="probabilidadeForm">Probabilidade Inerente (1–5)</label>
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
                            {salvando ? "Salvando..." : "Salvar"}
                          </button>
                          {sucessoSalvar && <span className="text-muted" style={{ fontSize: "0.85rem" }}>Salvo.</span>}
                        </div>
                        {erroSalvar && (
                          <div className="error-banner form-field-wide" style={{ marginTop: 0 }}>
                            <span className="success-icon error-icon">!</span>
                            <span className="success-text">{erroSalvar}</span>
                          </div>
                        )}
                      </form>
                    </>
                  )}
                </div>
              </div>

              <div className="dash-panel">
                <div className="dash-panel-header">Fatores de Risco e Controles</div>
                <div className="dash-panel-body">
                  <p className="text-muted" style={{ fontSize: "0.82rem", marginTop: 0, marginBottom: "1rem" }}>
                    Cada fator abaixo empurra a Probabilidade e/ou o Impacto deste risco. O Índice de
                    Mitigação (e, por consequência, o nível Atual/Projetado no painel acima) é recalculado
                    automaticamente a cada fator adicionado, editado ou removido.
                  </p>

                  {risco.fatores.length === 0 && (
                    <p className="text-muted" style={{ fontSize: "0.85rem" }}>
                      Nenhum fator de risco cadastrado ainda — o nível Atual permanece igual ao Inerente.
                    </p>
                  )}

                  {risco.fatores.map((f) => (
                    <FatorRiscoCard key={f.id} fator={f} riscoMitigado={riscoMitigado} onAtualizado={carregarRisco} />
                  ))}

                  {riscoMitigado ? (
                    <p className="field-helper" style={{ margin: "1rem 0 0" }}>
                      Este risco foi mitigado — não é possível cadastrar novos fatores de risco.
                    </p>
                  ) : (
                    <>
                      <p style={{ fontSize: "0.8rem", fontWeight: 600, marginTop: "1rem", marginBottom: "0.75rem" }}>
                        Novo fator de risco
                      </p>
                      <NovoFatorForm riscoId={risco.id} onCriado={carregarRisco} />
                    </>
                  )}
                </div>
              </div>

              <div className="dash-panel">
                <div className="dash-panel-header">Planos de Ação</div>
                <div className="dash-panel-body">
                  {carregandoPlanos && <p className="text-muted" style={{ fontSize: "0.85rem" }}>Carregando planos...</p>}

                  {!carregandoPlanos && planos.length === 0 && (
                    <p className="text-muted" style={{ fontSize: "0.85rem", marginTop: 0 }}>
                      Nenhum plano de ação cadastrado para este risco ainda.
                    </p>
                  )}

                  {!carregandoPlanos && planos.map((p) => (
                    <PlanoAcaoCard key={p.id} plano={p} riscoMitigado={riscoMitigado} onAtualizado={carregarPlanos} />
                  ))}

                  {riscoMitigado ? (
                    <p className="field-helper" style={{ margin: "1rem 0 0" }}>
                      Este risco foi mitigado — não é possível cadastrar novos planos de ação.
                    </p>
                  ) : (
                    <>
                      <p style={{ fontSize: "0.8rem", fontWeight: 600, marginTop: "1rem", marginBottom: "0.75rem" }}>
                        Novo plano de ação
                      </p>
                      <form onSubmit={handleCadastrarPlano} className="form-grid" style={{ maxWidth: "30rem" }}>
                        <div className="form-field form-field-wide">
                          <label htmlFor="tituloPlano">Título</label>
                          <input
                            id="tituloPlano"
                            type="text"
                            value={tituloPlano}
                            onChange={(e) => setTituloPlano(e.target.value)}
                            placeholder="Ex.: Redundância de link de internet"
                            required
                          />
                        </div>
                        <div className="form-field-wide form-actions">
                          <button type="submit" className="btn-primary" disabled={salvandoPlano}>
                            {salvandoPlano ? "Salvando..." : "Criar plano de ação"}
                          </button>
                        </div>
                        {erroPlano && (
                          <div className="error-banner form-field-wide" style={{ marginTop: 0 }}>
                            <span className="success-icon error-icon">!</span>
                            <span className="success-text">{erroPlano}</span>
                          </div>
                        )}
                      </form>
                    </>
                  )}
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
