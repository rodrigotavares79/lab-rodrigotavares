"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import s from "./relatorio.module.css";
import { usePerfilRiscos, SemPermissao } from "@/components/riscos/PermissoesRiscos";

// Relatório de Auditoria: o solicitante escolhe o projeto e o período, e a
// tela lista cada plano de ação com responsável, prazo, status e
// conformidade. O período filtra pelo prazo do plano (maior prazo entre as
// ações dele).

const BASE = "/seguranca/gestao-de-riscos";

type Projeto = { id: number; nome: string };
type Linha = {
  id: number;
  titulo: string;
  status: string;
  auditoria_status: "Pendente" | "Conforme" | "Não conforme" | null;
  auditado_em: string | null;
  auditado_por_nome: string | null;
  auditoria_comentario: string | null;
  risco_id: number;
  gatilho: string | null;
  risco_titulo?: string | null;
  projeto: string;
  prazo: string;
  responsaveis: string | null;
  total_acoes: number;
  acoes_concluidas: number;
};
type Resultado = {
  linhas: Linha[];
  resumo: { conforme: number; nao_conforme: number; pendente: number; nao_auditado: number };
  total: number;
};

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatData(d: string | null) {
  if (!d) return "—";
  return new Date(String(d).slice(0, 10) + "T00:00:00").toLocaleDateString("pt-BR");
}

function rotuloConformidade(l: Linha) {
  if (l.auditoria_status === "Conforme") return { texto: "Conforme", classe: s.conforme };
  if (l.auditoria_status === "Não conforme") return { texto: "Não conforme", classe: s.naoConforme };
  if (l.auditoria_status === "Pendente") return { texto: "Aguardando auditoria", classe: s.pendente };
  return { texto: "Não auditado", classe: s.naoAuditado };
}

export default function RelatorioAuditoria() {
  const perfil = usePerfilRiscos();
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [projetoId, setProjetoId] = useState("");
  const [inicio, setInicio] = useState(`${new Date().getFullYear()}-01-01`);
  const [fim, setFim] = useState(hojeISO());
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [filtroAplicado, setFiltroAplicado] = useState<{ projeto: string; inicio: string; fim: string } | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projetos")
      .then((r) => r.json())
      .then((d) => setProjetos(d.projetos || []))
      .catch(() => setProjetos([]));
  }, []);

  async function gerar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErro(null);
    try {
      const qs = new URLSearchParams({ projetoId, inicio, fim });
      const res = await fetch(`/api/auditoria/relatorio?${qs}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao gerar o relatório.");
      setResultado(body);
      setFiltroAplicado({
        projeto: projetos.find((p) => String(p.id) === projetoId)?.nome || "Todos os projetos",
        inicio,
        fim,
      });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao gerar o relatório.");
      setResultado(null);
    } finally {
      setCarregando(false);
    }
  }

  if (perfil.carregado && !perfil.permissoes.verAuditoria) {
    return (
      <>
        <SemPermissao mensagem="Seu perfil não tem acesso às informações de auditoria." />
        <Footer />
      </>
    );
  }

  return (
    <>
      <section className="content-block">
        <div className={`container ${s.pagina}`}>
          <div>
            <span className="eyebrow">Auditoria</span>
            <h1>Relatório de Auditoria</h1>
            <p className={s.subtitulo}>
              Selecione o projeto e o período para ver a conformidade dos planos de ação. O período considera o prazo de
              cada plano.
            </p>
          </div>

          <form onSubmit={gerar} className={s.filtros}>
            <div className="form-field">
              <label htmlFor="relProjeto">Projeto</label>
              <select id="relProjeto" value={projetoId} onChange={(e) => setProjetoId(e.target.value)}>
                <option value="">Todos os projetos</option>
                {projetos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="relInicio">Data inicial</label>
              <input id="relInicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
            </div>
            <div className="form-field">
              <label htmlFor="relFim">Data final</label>
              <input id="relFim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} required />
            </div>
            <button type="submit" className={s.botao} disabled={carregando}>
              {carregando ? "Gerando..." : "Gerar relatório"}
            </button>
          </form>

          {erro && (
            <div className="error-banner">
              <span className="success-icon error-icon">!</span>
              <span className="success-text">{erro}</span>
            </div>
          )}

          {resultado && filtroAplicado && (
            <section className={s.resultado} aria-label="Resultado do relatório">
              <div className={s.cabecalho}>
                <div>
                  <h2 className={s.tituloResultado}>{filtroAplicado.projeto}</h2>
                  <span className={s.periodo}>
                    Prazo entre {formatData(filtroAplicado.inicio)} e {formatData(filtroAplicado.fim)} ·{" "}
                    {resultado.total} plano{resultado.total === 1 ? "" : "s"} de ação
                  </span>
                </div>
                <div className={s.resumo}>
                  <span className={`${s.chip} ${s.conforme}`}>Conforme · {resultado.resumo.conforme}</span>
                  <span className={`${s.chip} ${s.naoConforme}`}>Não conforme · {resultado.resumo.nao_conforme}</span>
                  <span className={`${s.chip} ${s.pendente}`}>Aguardando · {resultado.resumo.pendente}</span>
                  <span className={`${s.chip} ${s.naoAuditado}`}>Não auditado · {resultado.resumo.nao_auditado}</span>
                </div>
              </div>

              {resultado.total === 0 ? (
                <p className={s.vazio}>Nenhum plano de ação com prazo nesse período.</p>
              ) : (
                <div className="dash-table-scroll">
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>Projeto</th>
                        <th>Plano de Ação</th>
                        <th>Responsável</th>
                        <th>Prazo</th>
                        <th>Status</th>
                        <th>Conformidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.linhas.map((l) => {
                        const c = rotuloConformidade(l);
                        return (
                          <tr key={l.id}>
                            <td>{l.projeto}</td>
                            <td style={{ whiteSpace: "normal", minWidth: "16rem" }}>
                              <span className={s.plano}>{l.titulo}</span>
                              <Link href={`${BASE}/riscos/${l.risco_id}#planos-de-acao`} className={s.risco}>
                                Risco #{l.risco_id}
                                {l.risco_titulo || l.gatilho ? ` · ${l.risco_titulo || l.gatilho}` : ""}
                              </Link>
                            </td>
                            <td style={{ whiteSpace: "normal", minWidth: "9rem" }}>{l.responsaveis || "—"}</td>
                            <td>{formatData(l.prazo)}</td>
                            <td>
                              {l.status}
                              <span className={s.sub}>
                                {l.acoes_concluidas}/{l.total_acoes} ações
                              </span>
                            </td>
                            <td style={{ whiteSpace: "normal", minWidth: "10rem" }}>
                              <span className={`${s.chip} ${c.classe}`}>{c.texto}</span>
                              {(l.auditoria_status === "Conforme" || l.auditoria_status === "Não conforme") && (
                                <span className={s.sub} title={l.auditoria_comentario || undefined}>
                                  {formatData(l.auditado_em)}
                                  {l.auditado_por_nome ? ` · ${l.auditado_por_nome}` : ""}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          <section className={s.resultado} aria-label="Log de alterações">
            <div className={s.cabecalho}>
              <div>
                <h2 className={s.tituloResultado}>Log de alterações</h2>
                <span className={s.periodo}>
                  Toda criação, alteração e exclusão em riscos, fatores, planos, ações, evidências e auditorias, com
                  autor, data e hora, entre {formatData(inicio)} e {formatData(fim)} (todos os projetos).
                </span>
              </div>
              <a
                className={s.botao}
                href={`/api/log-alteracoes?${new URLSearchParams({ inicio, fim })}`}
                download
              >
                Exportar CSV
              </a>
            </div>
          </section>
        </div>
      </section>
      <Footer />
    </>
  );
}
