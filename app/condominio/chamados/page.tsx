"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";

type ChamadoLinha = {
  id: number;
  titulo: string;
  status: string;
  urgencia: string | null;
  prazo_sla: string | null;
  global: boolean;
  aberto_por_nome: string;
  aberto_por_unidade: string | null;
  criado_em: string;
  tipo: string | null;
  fornecedor: string | null;
};

function classeStatus(status: string): string {
  if (status === "Resolvido") return "status-resolved";
  if (status === "Novo" || status === "Reaberto") return "status-identified";
  if (status === "Cancelado") return "status-pending";
  return "status-identified";
}

function classeUrgencia(urgencia: string | null): string {
  if (urgencia === "Urgente") return "badge badge-critico";
  if (urgencia === "Média") return "badge badge-medio";
  if (urgencia === "Baixa") return "badge badge-baixo";
  return "";
}

function slaVencido(prazo: string | null, status: string): boolean {
  if (!prazo || status === "Resolvido" || status === "Cancelado") return false;
  return new Date(prazo) < new Date();
}

function formatDataHora(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function Chamados() {
  const [chamados, setChamados] = useState<ChamadoLinha[]>([]);
  const [perfil, setPerfil] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/chamados")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setChamados(d.chamados || []);
        setPerfil(d.perfil || null);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar chamados."))
      .finally(() => setCarregando(false));
  }, []);

  const gerente = perfil === "sindico" || perfil === "conselheiro" || perfil === "conselheiro_admin";

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Condomínio</span>
          <h1>Chamados</h1>
          <p className="lede">
            {gerente
              ? "Todos os chamados abertos no condomínio."
              : "Os chamados que você abriu, mais os marcados como visíveis a todos."}
          </p>

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

          {!carregando && !erro && chamados.length === 0 && (
            <div className="dash-panel" style={{ marginTop: "2rem" }}>
              <div className="dash-panel-body">
                <p className="text-muted" style={{ margin: 0 }}>
                  Nenhum chamado por aqui ainda. Abra um em{" "}
                  <a href="/condominio/novo-chamado">Abrir Chamado</a>.
                </p>
              </div>
            </div>
          )}

          {!carregando && !erro && chamados.length > 0 && (
            <div className="dash-panel" style={{ marginTop: "2rem" }}>
              <div className="dash-panel-header">
                {chamados.length} chamado{chamados.length > 1 ? "s" : ""}
              </div>
              <div className="dash-panel-body">
                <div className="dash-table-scroll">
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Título</th>
                        <th>Tipo</th>
                        <th>Urgência</th>
                        <th>Status</th>
                        {gerente && <th>Unidade</th>}
                        <th>Fornecedor</th>
                        <th>Prazo SLA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chamados.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <Link
                              href={`/condominio/chamados/${c.id}`}
                              style={{ color: "var(--accent)", fontWeight: 600 }}
                            >
                              #{c.id}
                            </Link>
                          </td>
                          <td style={{ whiteSpace: "normal", minWidth: "14rem" }}>
                            {c.titulo}{" "}
                            {c.global && <span className="status-tag" style={{ marginLeft: "0.3rem" }}>Global</span>}
                          </td>
                          <td>{c.tipo || "—"}</td>
                          <td>
                            {c.urgencia ? <span className={classeUrgencia(c.urgencia)}>{c.urgencia}</span> : "—"}
                          </td>
                          <td className={classeStatus(c.status)}>{c.status}</td>
                          {gerente && <td>{c.aberto_por_unidade || "—"}</td>}
                          <td>{c.fornecedor || "—"}</td>
                          <td>
                            {formatDataHora(c.prazo_sla)}
                            {slaVencido(c.prazo_sla, c.status) && (
                              <span className="report-vencida" style={{ marginLeft: "0.4rem", fontSize: "0.72rem" }}>
                                ⚠ Vencido
                              </span>
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

          <a
            href="/condominio"
            className="status-tag"
            style={{ marginTop: "2.5rem", display: "inline-block" }}
          >
            ← Voltar para Gestão de Condomínio
          </a>
        </div>
      </section>
      <Footer />
    </>
  );
}
