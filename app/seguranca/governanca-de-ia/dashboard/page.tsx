"use client";

import { useState, useEffect } from "react";
import Footer from "@/components/Footer";
import { SistemaIcone } from "@/lib/brandIcons";

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

function formatData(iso: string): string {
  const [ano, mes, dia] = String(iso).slice(0, 10).split("-");
  if (!ano || !mes || !dia) return String(iso);
  return `${dia}/${mes}/${ano}`;
}

function ParecerCell({ sistema }: { sistema: SistemaIA }) {
  if (sistema.parecer_aprovado !== true) {
    return <span className="text-muted">{sistema.parecer_aprovado === false ? "Não aprovado" : "—"}</span>;
  }
  return <span>📎 {sistema.parecer_numero_chamado ? `#${sistema.parecer_numero_chamado}` : "Aprovado"}</span>;
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
  const semParecer = sistemas.filter((s) => s.parecer_aprovado !== true).length;

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
                  <div className="kpi-card-value">{semParecer}</div>
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
                            <td>{s.dados_tratados || "—"}</td>
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
