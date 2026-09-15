"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type Kpis = {
  total: number;
  mitigados: number;
  criticos_abertos: number;
  exposicao_critica: number;
  exposicao_alta: number;
};

type Mitigacao = { melhorou: number; manteve: number; piorou: number };

type RiscoAberto = {
  id: number;
  categoria: string | null;
  gatilho: string | null;
  impacto_qualitativo: string;
  status: string;
};

type PlanosResumo = { total: number; concluidos: number; abertos: number; acoesVencidas: number };

type PlanoLinha = {
  id: number;
  titulo: string;
  status: string;
  risco_id: number;
  total_acoes: number;
  acoes_concluidas: number;
};

type RankingItem = {
  categoria: string | null;
  gatilho: string | null;
  impacto_critico_total: number;
  impacto_alto_total: number;
};

type RelatorioData = {
  projeto: string;
  kpis: Kpis;
  mitigacao: Mitigacao;
  riscosAbertos: RiscoAberto[];
  planosResumo: PlanosResumo;
  planos: PlanoLinha[];
  ranking: RankingItem[];
};

const BADGE_POR_NIVEL: Record<string, string> = {
  "Baixo": "badge-baixo",
  "Médio": "badge-medio",
  "Alto": "badge-alto",
  "Crítico": "badge-critico",
};

function classeStatusTexto(status: string): string {
  if (status === "Mitigado") return "report-status-mitigado";
  if (status === "Identificado") return "report-status-identificado";
  return "report-status-tratamento";
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function formatDataHoje(): string {
  return new Date().toLocaleDateString("pt-BR");
}

function RelatorioConteudo() {
  const searchParams = useSearchParams();
  const projetoId = searchParams.get("projetoId");

  const [dados, setDados] = useState<RelatorioData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!projetoId) {
      setErro("Nenhum projeto informado. Volte ao Dashboard, selecione um projeto e clique em 'Emitir Relatório'.");
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro(null);
    fetch(`/api/relatorio?projetoId=${projetoId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setDados(d);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar o relatório."))
      .finally(() => setCarregando(false));
  }, [projetoId]);

  return (
    <>
      <div className="report-toolbar">
        <button className="btn-primary" onClick={() => window.print()}>
          🖶 Imprimir / Salvar como PDF
        </button>
        <a href="/seguranca/gestao-de-riscos/dashboard" className="status-tag" style={{ marginTop: 0 }}>
          ← Voltar para o Dashboard
        </a>
      </div>

      {carregando && (
        <p className="text-muted" style={{ textAlign: "center", marginTop: "3rem" }}>Carregando relatório...</p>
      )}

      {erro && (
        <div className="error-banner" style={{ maxWidth: "34rem", margin: "3rem auto" }}>
          <span className="success-icon error-icon">!</span>
          <span className="success-text">{erro}</span>
        </div>
      )}

      {!carregando && !erro && dados && (
        <div className="report-page">
          <div className="report-header">
            <div>
              <span className="report-brand">Rodrigo Tavares — Gestão de Riscos de TI</span>
              <h1>Relatório Executivo de Riscos</h1>
              <div className="report-subtitle">Projeto: {dados.projeto}</div>
            </div>
            <div className="report-meta">
              <strong>Emitido em</strong>
              {formatDataHoje()}
              <br />
              <strong style={{ marginTop: "0.4rem" }}>Período considerado</strong>
              Desde o início do cadastro
            </div>
          </div>

          <div className="report-section">
            <h2>Resumo Executivo</h2>
            <div className="report-kpi-row">
              <div className="report-kpi-box">
                <div className="report-kpi-label">Riscos Cadastrados</div>
                <div className="report-kpi-value">{dados.kpis.total}</div>
              </div>
              <div className="report-kpi-box report-alert">
                <div className="report-kpi-label">Críticos Abertos</div>
                <div className="report-kpi-value">{dados.kpis.criticos_abertos}</div>
              </div>
              <div className="report-kpi-box report-ok">
                <div className="report-kpi-label">Mitigados</div>
                <div className="report-kpi-value">{dados.kpis.mitigados}</div>
              </div>
              <div className="report-kpi-box">
                <div className="report-kpi-label">Exposição (Evento Crítico)</div>
                <div className="report-kpi-value" style={{ fontSize: "1.15rem" }}>
                  {formatBRL(dados.kpis.exposicao_critica)}
                </div>
              </div>
            </div>
          </div>

          <div className="report-section">
            <h2>Nível Inicial x Nível Atual</h2>
            <p className="text-muted" style={{ fontSize: "0.85rem", margin: "0 0 0.5rem" }}>
              Evolução do nível de risco desde o cadastro, considerando reavaliações após medidas de mitigação.
            </p>
            <div className="report-mitig-row">
              <span><span className="report-dot" style={{ background: "#3f7d58" }} /><strong>{dados.mitigacao.melhorou}</strong> melhoraram de nível</span>
              <span><span className="report-dot" style={{ background: "#6b6b66" }} /><strong>{dados.mitigacao.manteve}</strong> sem mudança</span>
              <span><span className="report-dot" style={{ background: "#a3242f" }} /><strong>{dados.mitigacao.piorou}</strong> pioraram de nível</span>
            </div>
          </div>

          <div className="report-section">
            <h2>Riscos Críticos e Altos em Aberto</h2>
            {dados.riscosAbertos.length === 0 ? (
              <p className="text-muted" style={{ fontSize: "0.85rem", margin: 0 }}>
                Nenhum risco Crítico ou Alto em aberto neste projeto.
              </p>
            ) : (
              <table className="report-table">
                <thead>
                  <tr><th>ID</th><th>Categoria</th><th>Ponto de Gatilho</th><th>Nível</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {dados.riscosAbertos.map((r) => (
                    <tr key={r.id}>
                      <td>#{r.id}</td>
                      <td>{r.categoria || "—"}</td>
                      <td>{r.gatilho || "—"}</td>
                      <td><span className={`badge ${BADGE_POR_NIVEL[r.impacto_qualitativo] || ""}`}>{r.impacto_qualitativo}</span></td>
                      <td className={classeStatusTexto(r.status)}>{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="report-section">
            <h2>Planos de Ação</h2>
            <div className="report-plan-summary">
              <div><strong>{dados.planosResumo.total}</strong>planos cadastrados</div>
              <div><strong>{dados.planosResumo.concluidos}</strong>concluídos</div>
              <div><strong>{dados.planosResumo.abertos}</strong>em aberto</div>
              <div><strong>{dados.planosResumo.acoesVencidas}</strong>ações com prazo vencido</div>
            </div>
            {dados.planos.length === 0 ? (
              <p className="text-muted" style={{ fontSize: "0.85rem", margin: 0 }}>
                Nenhum plano de ação cadastrado neste projeto ainda.
              </p>
            ) : (
              <table className="report-table">
                <thead>
                  <tr><th>Plano</th><th>Risco</th><th>Status</th><th>Ações (concluídas / total)</th></tr>
                </thead>
                <tbody>
                  {dados.planos.map((p) => (
                    <tr key={p.id}>
                      <td>{p.titulo}</td>
                      <td>#{p.risco_id}</td>
                      <td className={classeStatusTexto(p.status === "Concluído" ? "Mitigado" : "Em Tratamento")}>{p.status}</td>
                      <td>{p.acoes_concluidas} / {p.total_acoes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="report-section">
            <h2>Maior Exposição Financeira</h2>
            {dados.ranking.length === 0 ? (
              <p className="text-muted" style={{ fontSize: "0.85rem", margin: 0 }}>
                Nenhum risco com sistema crítico vinculado ainda.
              </p>
            ) : (
              <table className="report-table">
                <thead>
                  <tr><th>Categoria</th><th>Ponto de Gatilho</th><th>Evento Crítico</th><th>Alto Impacto</th></tr>
                </thead>
                <tbody>
                  {dados.ranking.map((r, i) => (
                    <tr key={i}>
                      <td>{r.categoria || "—"}</td>
                      <td>{r.gatilho || "—"}</td>
                      <td>{formatBRL(r.impacto_critico_total)}</td>
                      <td>{formatBRL(r.impacto_alto_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="report-footer">
            <span>Gerado automaticamente pelo sistema de Gestão de Riscos — lab.rodrigotavares.com.br</span>
            <span>Página 1 de 1</span>
          </div>
        </div>
      )}
    </>
  );
}

export default function RelatorioExecutivo() {
  return (
    <Suspense fallback={<p className="text-muted" style={{ textAlign: "center", marginTop: "3rem" }}>Carregando...</p>}>
      <RelatorioConteudo />
    </Suspense>
  );
}
