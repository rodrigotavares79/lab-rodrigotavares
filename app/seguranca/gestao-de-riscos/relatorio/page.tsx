"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type Kpis = {
  total: number;
  mitigados: number;
  criticos_abertos: number;
};

type Mitigacao = { melhorou: number; manteve: number; piorou: number };

type RiscoAberto = {
  id: number;
  categoria: string | null;
  gatilho: string | null;
  titulo?: string | null;
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

type RiscoApetite = RiscoAberto & {
  situacao: "acima_tolerancia" | "acima_apetite";
  apetite: string | null;
  tolerancia: string | null;
  dono_nome: string | null;
};

type RelatorioData = {
  projeto: string;
  apetite?: { versao: number | null; acimaTolerancia: number; acimaApetite: number; riscos: RiscoApetite[] };
  kpis: Kpis;
  mitigacao: Mitigacao;
  riscosAbertos: RiscoAberto[];
  planosResumo: PlanosResumo;
  planos: PlanoLinha[];
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
                <div className="report-kpi-label">Críticos em Aberto</div>
                <div className="report-kpi-value">{dados.kpis.criticos_abertos}</div>
              </div>
              {dados.apetite && (
                <div className={`report-kpi-box ${dados.apetite.acimaTolerancia > 0 ? "report-alert" : ""}`}>
                  <div className="report-kpi-label">Acima da Tolerância</div>
                  <div className="report-kpi-value">{dados.apetite.acimaTolerancia}</div>
                </div>
              )}
              <div className="report-kpi-box report-ok">
                <div className="report-kpi-label">Mitigados</div>
                <div className="report-kpi-value">{dados.kpis.mitigados}</div>
              </div>
            </div>
          </div>

          <div className="report-section">
            <h2>Nível Inicial x Nível Atual</h2>
            <p className="text-muted" style={{ fontSize: "0.85rem", margin: "0 0 0.5rem" }}>
              Evolução do nível de risco desde o cadastro, considerando reavaliações após medidas de mitigação.
            </p>
            <div className="report-mitig-row">
              <span><span className="report-dot" style={{ background: "var(--success)" }} /><strong>{dados.mitigacao.melhorou}</strong> melhoraram de nível</span>
              <span><span className="report-dot" style={{ background: "var(--text-muted)" }} /><strong>{dados.mitigacao.manteve}</strong> sem mudança</span>
              <span><span className="report-dot" style={{ background: "var(--danger)" }} /><strong>{dados.mitigacao.piorou}</strong> pioraram de nível</span>
            </div>
          </div>

          {dados.apetite && (
            <div className="report-section">
              <h2>Riscos Acima do Apetite e da Tolerância</h2>
              <p className="text-muted" style={{ fontSize: "0.85rem", margin: "0 0 0.5rem" }}>
                {dados.apetite.versao
                  ? `Nível atual comparado aos limites da categoria (versão ${dados.apetite.versao} do apetite a risco). Acima da tolerância exige tratamento prioritário ou decisão da alta gestão.`
                  : "O apetite e a tolerância a risco ainda não foram aprovados."}
              </p>
              {dados.apetite.versao && dados.apetite.riscos.length === 0 ? (
                <p className="text-muted" style={{ fontSize: "0.85rem", margin: 0 }}>
                  Todos os riscos ativos deste projeto estão dentro do apetite.
                </p>
              ) : dados.apetite.riscos.length > 0 ? (
                <table className="report-table">
                  <thead>
                    <tr><th>ID</th><th>Categoria</th><th>Risco</th><th>Nível atual</th><th>Limite (apetite / tolerância)</th><th>Situação</th><th>Dono</th></tr>
                  </thead>
                  <tbody>
                    {dados.apetite.riscos.map((r) => (
                      <tr key={r.id}>
                        <td>#{r.id}</td>
                        <td>{r.categoria || "—"}</td>
                        <td>{r.titulo || r.gatilho || "—"}</td>
                        <td><span className={`badge ${BADGE_POR_NIVEL[r.impacto_qualitativo] || ""}`}>{r.impacto_qualitativo}</span></td>
                        <td>{r.apetite} / {r.tolerancia}</td>
                        <td style={{ fontWeight: 600, color: r.situacao === "acima_tolerancia" ? "var(--danger)" : "var(--warning-text)" }}>
                          {r.situacao === "acima_tolerancia" ? "▲▲ Acima da tolerância" : "▲ Acima do apetite"}
                        </td>
                        <td>{r.dono_nome || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>
          )}

          <div className="report-section">
            <h2>Riscos Críticos e Altos em Aberto</h2>
            {dados.riscosAbertos.length === 0 ? (
              <p className="text-muted" style={{ fontSize: "0.85rem", margin: 0 }}>
                Nenhum risco Crítico ou Alto em aberto neste projeto.
              </p>
            ) : (
              <table className="report-table">
                <thead>
                  <tr><th>ID</th><th>Categoria</th><th>Risco</th><th>Nível</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {dados.riscosAbertos.map((r) => (
                    <tr key={r.id}>
                      <td>#{r.id}</td>
                      <td>{r.categoria || "—"}</td>
                      <td>{r.titulo || r.gatilho || "—"}</td>
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
