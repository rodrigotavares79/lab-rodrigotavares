"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";

// Lista das ações com prazo vencido (aberta pelo KPI "Ações atrasadas" da
// página inicial). Cada linha leva aos planos de ação do risco de origem.

const BASE = "/seguranca/gestao-de-riscos";

type AcaoAtrasada = {
  id: number;
  descricao: string;
  responsavel: string | null;
  prazo: string;
  status: string;
  plano: string;
  risco_id: number;
  gatilho: string | null;
  categoria: string | null;
  impacto_qualitativo: string | null;
  dias_atraso: number;
};

const BADGE_POR_NIVEL: Record<string, string> = {
  Baixo: "badge-baixo",
  Moderado: "badge-medio",
  Significativo: "badge-alto",
  Alto: "badge-critico",
};

function formatData(d: string) {
  return new Date(String(d).slice(0, 10) + "T00:00:00").toLocaleDateString("pt-BR");
}

export default function AcoesAtrasadas() {
  const [acoes, setAcoes] = useState<AcaoAtrasada[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/acoes-atrasadas")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setAcoes(d.acoes || []);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar as ações."));
  }, []);

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos</span>
          <h1>Ações atrasadas</h1>
          <p className="lede">Ações de planos de ação com prazo vencido e ainda não concluídas.</p>

          {!acoes && !erro && <p className="text-muted" style={{ marginTop: "2rem" }}>Carregando...</p>}

          {erro && (
            <div className="error-banner" style={{ marginTop: "2rem" }}>
              <span className="success-icon error-icon">!</span>
              <span className="success-text">
                <strong>Não foi possível carregar as ações.</strong>
                <span>{erro}</span>
              </span>
            </div>
          )}

          {acoes && acoes.length === 0 && (
            <div className="dash-panel" style={{ marginTop: "2rem" }}>
              <div className="dash-panel-body">
                <p className="text-muted" style={{ margin: 0 }}>Nenhuma ação atrasada. Tudo dentro do prazo.</p>
              </div>
            </div>
          )}

          {acoes && acoes.length > 0 && (
            <div className="dash-panel" style={{ marginTop: "2rem" }}>
              <div className="dash-panel-header">
                {acoes.length} {acoes.length > 1 ? "ações atrasadas" : "ação atrasada"}
              </div>
              <div className="dash-panel-body">
                <div className="dash-table-scroll">
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>Ação</th>
                        <th>Risco</th>
                        <th>Nível</th>
                        <th>Responsável</th>
                        <th>Prazo</th>
                        <th>Atraso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {acoes.map((a) => (
                        <tr key={a.id}>
                          <td style={{ whiteSpace: "normal", minWidth: "14rem" }}>
                            <Link
                              href={`${BASE}/riscos/${a.risco_id}#planos-de-acao`}
                              style={{ color: "var(--accent)", fontWeight: 600 }}
                            >
                              {a.descricao}
                            </Link>
                            <div className="text-muted" style={{ fontSize: "0.75rem" }}>{a.plano}</div>
                          </td>
                          <td style={{ whiteSpace: "normal", minWidth: "12rem" }}>
                            #{a.risco_id} · {a.gatilho || a.categoria || "—"}
                          </td>
                          <td>
                            {a.impacto_qualitativo ? (
                              <span className={`badge ${BADGE_POR_NIVEL[a.impacto_qualitativo] || ""}`}>
                                {a.impacto_qualitativo}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td>{a.responsavel || "—"}</td>
                          <td>{formatData(a.prazo)}</td>
                          <td style={{ color: "var(--danger)", fontWeight: 600 }}>
                            {a.dias_atraso} dia{a.dias_atraso === 1 ? "" : "s"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <a href={BASE} className="status-tag" style={{ marginTop: "2.5rem", display: "inline-block" }}>
            ← Voltar para Gestão de Riscos
          </a>
        </div>
      </section>
      <Footer />
    </>
  );
}
