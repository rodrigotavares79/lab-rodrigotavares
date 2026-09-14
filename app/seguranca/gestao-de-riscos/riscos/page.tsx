"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";

type Projeto = { id: number; nome: string };
type RiscoLinha = {
  id: number;
  projeto: string;
  categoria: string | null;
  gatilho: string | null;
  levantado_por: string;
  data_levantamento: string | null;
  impacto_qualitativo: string | null;
  matrix_score: number | null;
  status: string | null;
  criado_em: string;
};

const BADGE_POR_NIVEL: Record<string, string> = {
  "Baixo": "badge-baixo",
  "Médio": "badge-medio",
  "Alto": "badge-alto",
  "Crítico": "badge-critico",
};

function classeStatus(status: string | null): string {
  if (status === "Mitigado") return "status-resolved";
  if (status === "Identificado") return "status-identified";
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

export default function ListaDeRiscos() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [projetoId, setProjetoId] = useState("");
  const [riscos, setRiscos] = useState<RiscoLinha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projetos")
      .then((r) => r.json())
      .then((d) => setProjetos(d.projetos || []))
      .catch(() => setProjetos([]));
  }, []);

  useEffect(() => {
    setCarregando(true);
    setErro(null);
    const url = projetoId ? `/api/riscos?projetoId=${projetoId}` : "/api/riscos";
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setRiscos(d.riscos || []);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar riscos."))
      .finally(() => setCarregando(false));
  }, [projetoId]);

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos</span>
          <h1>Lista de Riscos</h1>
          <p className="lede">
            Todos os riscos cadastrados individualmente. Clique em um risco para ver o
            detalhe completo, o nível atual e o plano de ação.
          </p>

          <div className="form-field" style={{ maxWidth: "20rem", marginTop: "1.5rem" }}>
            <label htmlFor="filtroProjetoLista">Projeto</label>
            <select
              id="filtroProjetoLista"
              value={projetoId}
              onChange={(e) => setProjetoId(e.target.value)}
            >
              <option value="">Todos os Projetos</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>

          {carregando && <p className="text-muted" style={{ marginTop: "2rem" }}>Carregando...</p>}

          {erro && (
            <div className="error-banner" style={{ marginTop: "2rem" }}>
              <span className="success-icon error-icon">!</span>
              <span className="success-text">
                <strong>Não foi possível carregar a lista.</strong>
                <span>{erro}</span>
              </span>
            </div>
          )}

          {!carregando && !erro && riscos.length === 0 && (
            <div className="dash-panel" style={{ marginTop: "2rem" }}>
              <div className="dash-panel-body">
                <p className="text-muted" style={{ margin: 0 }}>
                  Nenhum risco cadastrado ainda {projetoId ? "para esse projeto" : ""}. Cadastre
                  riscos na página{" "}
                  <a href="/seguranca/gestao-de-riscos/cadastro-de-riscos">Cadastro de Riscos</a>.
                </p>
              </div>
            </div>
          )}

          {!carregando && !erro && riscos.length > 0 && (
            <div className="dash-panel" style={{ marginTop: "2rem" }}>
              <div className="dash-panel-header">
                {riscos.length} risco{riscos.length > 1 ? "s" : ""} encontrado{riscos.length > 1 ? "s" : ""}
              </div>
              <div className="dash-panel-body">
                <div className="dash-table-scroll">
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Projeto</th>
                        <th>Categoria</th>
                        <th>Ponto de Gatilho</th>
                        <th>Nível</th>
                        <th>Status</th>
                        <th>Levantado Por</th>
                        <th>Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riscos.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <Link
                              href={`/seguranca/gestao-de-riscos/riscos/${r.id}`}
                              style={{ color: "var(--accent)", fontWeight: 600 }}
                            >
                              #{r.id}
                            </Link>
                          </td>
                          <td>{r.projeto}</td>
                          <td>{r.categoria || "—"}</td>
                          <td style={{ whiteSpace: "normal", minWidth: "14rem" }}>{r.gatilho || "—"}</td>
                          <td>
                            {r.impacto_qualitativo ? (
                              <span className={`badge ${BADGE_POR_NIVEL[r.impacto_qualitativo] || ""}`}>
                                {r.impacto_qualitativo}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className={classeStatus(r.status)}>{r.status || "Identificado"}</td>
                          <td>{r.levantado_por}</td>
                          <td>{formatData(r.data_levantamento)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

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
