"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";

// B16 · Aceitações de risco aguardando decisão. A decisão é feita no painel
// "Aceitação do risco", na tela do risco, onde está a Carta de Risco.

const BASE = "/seguranca/gestao-de-riscos";

type Aceitacao = {
  id: number;
  risco_id: number;
  justificativa: string;
  validade_meses: number;
  nivel_no_pedido: string;
  carta_nome: string;
  solicitado_por_nome: string | null;
  solicitado_em: string;
  gatilho: string | null;
  categoria: string | null;
  impacto_qualitativo: string | null;
  dias_aguardando: number;
  alcada: string;
  podeDecidir: boolean;
  motivoSemDecisao: string | null;
};

const BADGE_POR_NIVEL: Record<string, string> = {
  Baixo: "badge-baixo",
  "Médio": "badge-medio",
  Alto: "badge-alto",
  "Crítico": "badge-critico",
};

export default function AceitacoesPendentes() {
  const [lista, setLista] = useState<Aceitacao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/aceitacoes-pendentes")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setLista(d.aceitacoes || []);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar as aceitações."));
  }, []);

  const minhas = (lista || []).filter((a) => a.podeDecidir).length;

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos</span>
          <h1>Aceitações pendentes</h1>
          <p className="lede">
            Pedidos de aceitação de risco com Carta de Risco aguardando aprovação. A decisão é feita na tela do
            risco, por quem tem alçada para o nível atual e não fez o pedido.
          </p>

          {!lista && !erro && <p className="text-muted" style={{ marginTop: "2rem" }}>Carregando...</p>}

          {erro && (
            <div className="error-banner" style={{ marginTop: "2rem" }}>
              <span className="success-icon error-icon">!</span>
              <span className="success-text">
                <strong>Não foi possível carregar as aceitações.</strong>
                <span>{erro}</span>
              </span>
            </div>
          )}

          {lista && lista.length === 0 && (
            <div className="dash-panel" style={{ marginTop: "2rem" }}>
              <div className="dash-panel-body">
                <p className="text-muted" style={{ margin: 0 }}>Nenhuma aceitação aguardando decisão.</p>
              </div>
            </div>
          )}

          {lista && lista.length > 0 && (
            <div className="dash-panel" style={{ marginTop: "2rem" }}>
              <div className="dash-panel-header">
                {lista.length} {lista.length > 1 ? "aceitações pendentes" : "aceitação pendente"}
                {" · "}
                {minhas === 0 ? "nenhuma para você decidir" : `${minhas} para você decidir`}
              </div>
              <div className="dash-panel-body">
                <div className="dash-table-scroll">
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>Risco</th>
                        <th>Nível</th>
                        <th>Justificativa</th>
                        <th>Pedido por</th>
                        <th>Aguardando</th>
                        <th>Quem aprova</th>
                        <th>Você</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lista.map((a) => (
                        <tr key={a.id}>
                          <td style={{ whiteSpace: "normal", minWidth: "12rem" }}>
                            <Link
                              href={`${BASE}/riscos/${a.risco_id}#aceitacao`}
                              style={{ color: "var(--accent)", fontWeight: 600 }}
                            >
                              #{a.risco_id} · {a.gatilho || a.categoria || "—"}
                            </Link>
                            <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                              {a.carta_nome} · validade pedida {a.validade_meses} meses
                            </div>
                          </td>
                          <td>
                            {a.impacto_qualitativo ? (
                              <span className={`badge ${BADGE_POR_NIVEL[a.impacto_qualitativo] || ""}`}>
                                {a.impacto_qualitativo}
                              </span>
                            ) : (
                              "—"
                            )}
                            {a.impacto_qualitativo !== a.nivel_no_pedido && (
                              <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                                era {a.nivel_no_pedido} no pedido
                              </div>
                            )}
                          </td>
                          <td style={{ whiteSpace: "normal", minWidth: "16rem" }}>{a.justificativa}</td>
                          <td>
                            {a.solicitado_por_nome || "—"}
                            <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                              {new Date(a.solicitado_em).toLocaleDateString("pt-BR")}
                            </div>
                          </td>
                          <td>
                            {a.dias_aguardando} dia{a.dias_aguardando === 1 ? "" : "s"}
                          </td>
                          <td style={{ whiteSpace: "normal" }}>{a.alcada}</td>
                          <td>
                            {a.podeDecidir ? (
                              <Link href={`${BASE}/riscos/${a.risco_id}#aceitacao`} className="status-tag">
                                Decidir
                              </Link>
                            ) : (
                              <span className="text-muted">{a.motivoSemDecisao}</span>
                            )}
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
