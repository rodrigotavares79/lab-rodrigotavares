"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";

// Riscos ativos com revisão periódica vencida (B17), aberta pelo KPI
// "Revisões vencidas" do Início e pelo menu. Cada linha leva ao risco, onde
// "Salvar reavaliação" registra a revisão.

const BASE = "/seguranca/gestao-de-riscos";

type RevisaoVencida = {
  id: number;
  gatilho: string | null;
  titulo?: string | null;
  categoria: string | null;
  impacto_qualitativo: string | null;
  status: string;
  projeto: string;
  revisado_em: string;
  dias_revisao: number;
  proxima_revisao: string;
  dias_atraso: number;
};

const BADGE_POR_NIVEL: Record<string, string> = {
  Baixo: "badge-baixo",
  "Médio": "badge-medio",
  "Alto": "badge-alto",
  "Crítico": "badge-critico",
};

function formatData(d: string) {
  return new Date(String(d).slice(0, 10) + "T00:00:00").toLocaleDateString("pt-BR");
}

export default function RevisoesVencidas() {
  const [riscos, setRiscos] = useState<RevisaoVencida[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/revisoes-vencidas")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setRiscos(d.riscos || []);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar as revisões."));
  }, []);

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos</span>
          <h1>Revisões vencidas</h1>
          <p className="lede">
            Riscos ativos que passaram do prazo de revisão do seu nível atual. Abra o risco, confira os valores e use
            &quot;Salvar reavaliação&quot; para registrar a revisão.
          </p>

          {!riscos && !erro && <p className="text-muted" style={{ marginTop: "2rem" }}>Carregando...</p>}

          {erro && (
            <div className="error-banner" style={{ marginTop: "2rem" }}>
              <span className="success-icon error-icon">!</span>
              <span className="success-text">
                <strong>Não foi possível carregar as revisões.</strong>
                <span>{erro}</span>
              </span>
            </div>
          )}

          {riscos && riscos.length === 0 && (
            <div className="dash-panel" style={{ marginTop: "2rem" }}>
              <div className="dash-panel-body">
                <p className="text-muted" style={{ margin: 0 }}>Nenhuma revisão vencida. Todos os riscos ativos estão em dia.</p>
              </div>
            </div>
          )}

          {riscos && riscos.length > 0 && (
            <div className="dash-panel" style={{ marginTop: "2rem" }}>
              <div className="dash-panel-header">
                {riscos.length} {riscos.length > 1 ? "riscos com revisão vencida" : "risco com revisão vencida"}
              </div>
              <div className="dash-panel-body">
                <div className="dash-table-scroll">
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>Risco</th>
                        <th>Projeto</th>
                        <th>Nível</th>
                        <th>Última revisão</th>
                        <th>Venceu em</th>
                        <th>Atraso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riscos.map((r) => (
                        <tr key={r.id}>
                          <td style={{ whiteSpace: "normal", minWidth: "14rem" }}>
                            <Link href={`${BASE}/riscos/${r.id}`} style={{ color: "var(--accent)", fontWeight: 600 }}>
                              #{r.id} · {r.titulo || r.gatilho || r.categoria || "—"}
                            </Link>
                            <div className="text-muted" style={{ fontSize: "0.75rem" }}>{r.status}</div>
                          </td>
                          <td>{r.projeto}</td>
                          <td>
                            {r.impacto_qualitativo ? (
                              <span className={`badge ${BADGE_POR_NIVEL[r.impacto_qualitativo] || ""}`}>
                                {r.impacto_qualitativo}
                              </span>
                            ) : (
                              "—"
                            )}
                            <div className="text-muted" style={{ fontSize: "0.75rem" }}>a cada {r.dias_revisao} dias</div>
                          </td>
                          <td>{formatData(r.revisado_em)}</td>
                          <td>{formatData(r.proxima_revisao)}</td>
                          <td style={{ color: "var(--danger)", fontWeight: 600 }}>
                            {r.dias_atraso} dia{r.dias_atraso === 1 ? "" : "s"}
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
