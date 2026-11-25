"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";

// Riscos ativos Alto e Crítico sem tratamento definido e com o prazo da
// política vencido (B02), aberta pelo KPI do Início e pelo menu. Cada linha
// leva aos planos de ação do risco.

const BASE = "/seguranca/gestao-de-riscos";

type SemTratamento = {
  id: number;
  gatilho: string | null;
  categoria: string | null;
  impacto_qualitativo: string | null;
  status: string;
  projeto: string;
  cadastrado_em: string;
  prazo_tratamento: string;
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

export default function SemTratamento() {
  const [riscos, setRiscos] = useState<SemTratamento[] | null>(null);
  const [prazoDias, setPrazoDias] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sem-tratamento")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setRiscos(d.riscos || []);
        setPrazoDias(d.prazoDias ?? null);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar os riscos."));
  }, []);

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos</span>
          <h1>Sem tratamento definido</h1>
          <p className="lede">
            Riscos Alto e Crítico ativos sem plano de ação depois do prazo da política
            {prazoDias !== null ? ` (${prazoDias} dias a partir do cadastro)` : ""}. A Política (item 4) exige plano de
            ação formal para esses riscos. Abra o risco e crie o plano de ação.
          </p>

          {!riscos && !erro && <p className="text-muted" style={{ marginTop: "2rem" }}>Carregando...</p>}

          {erro && (
            <div className="error-banner" style={{ marginTop: "2rem" }}>
              <span className="success-icon error-icon">!</span>
              <span className="success-text">
                <strong>Não foi possível carregar os riscos.</strong>
                <span>{erro}</span>
              </span>
            </div>
          )}

          {riscos && riscos.length === 0 && (
            <div className="dash-panel" style={{ marginTop: "2rem" }}>
              <div className="dash-panel-body">
                <p className="text-muted" style={{ margin: 0 }}>Nenhum risco Alto ou Crítico fora do prazo sem tratamento.</p>
              </div>
            </div>
          )}

          {riscos && riscos.length > 0 && (
            <div className="dash-panel" style={{ marginTop: "2rem" }}>
              <div className="dash-panel-header">
                {riscos.length} {riscos.length > 1 ? "riscos sem tratamento definido" : "risco sem tratamento definido"}
              </div>
              <div className="dash-panel-body">
                <div className="dash-table-scroll">
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>Risco</th>
                        <th>Projeto</th>
                        <th>Nível</th>
                        <th>Cadastrado em</th>
                        <th>Prazo do plano</th>
                        <th>Atraso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riscos.map((r) => (
                        <tr key={r.id}>
                          <td style={{ whiteSpace: "normal", minWidth: "14rem" }}>
                            <Link href={`${BASE}/riscos/${r.id}#planos-de-acao`} style={{ color: "var(--accent)", fontWeight: 600 }}>
                              #{r.id} · {r.gatilho || r.categoria || "—"}
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
                          </td>
                          <td>{formatData(r.cadastrado_em)}</td>
                          <td>{formatData(r.prazo_tratamento)}</td>
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
