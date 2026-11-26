"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import { FRAMEWORKS } from "@/lib/conformidadeFrameworks";
import { STATUS_CONTROLE, type Catalogo, type Cobertura, type FrameworkId, type Sugestao } from "@/lib/mapeamentoControles";
import s from "./conformidade.module.css";

// B24 · Conformidade com frameworks, por mapeamento CURADO: a palavra-chave e
// a biblioteca de cenários só sugerem; cada controle é confirmado (com status
// Implementado, Parcial ou Ausente) ou descartado por quem edita riscos. A
// cobertura de cada framework sai só dos controles confirmados.

const BASE = "/seguranca/gestao-de-riscos";
const IDS: FrameworkId[] = ["cis", "nist", "iso"];

type Confirmado = {
  framework: FrameworkId;
  controle_id: string;
  controle_titulo: string;
  status: (typeof STATUS_CONTROLE)[number];
  fonte: string;
  observacao: string | null;
  decidido_por_nome: string | null;
};

type Item = {
  id: number;
  gatilho: string | null;
  titulo?: string | null;
  categoria: string | null;
  nivel: string | null;
  status: string | null;
  projeto_id: number | null;
  projeto: string | null;
  cenario: string | null;
  confirmados: Confirmado[];
  descartados: number;
  sugestoes: Sugestao[];
};

type Dados = { riscos: Item[]; cobertura: Cobertura[]; catalogo: Catalogo; podeEditar: boolean };

const BADGE_POR_NIVEL: Record<string, string> = {
  Baixo: "badge-baixo",
  Médio: "badge-medio",
  Alto: "badge-alto",
  Crítico: "badge-critico",
};

const COR_STATUS: Record<string, { fundo: string; texto: string; icone: string }> = {
  Implementado: { fundo: "var(--success-tint)", texto: "var(--success)", icone: "✓" },
  Parcial: { fundo: "var(--warning-tint)", texto: "var(--warning-text)", icone: "◐" },
  Ausente: { fundo: "var(--danger-tint)", texto: "var(--danger)", icone: "✕" },
};

function nomeFw(fw: FrameworkId) {
  return `${FRAMEWORKS[fw].nome} ${FRAMEWORKS[fw].versao.split(" ")[0]}`;
}

function normalizar(t: string) {
  return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function SeloStatus({ status }: { status: string }) {
  const c = COR_STATUS[status];
  return (
    <span style={{ display: "inline-flex", gap: "0.25rem", alignItems: "center", padding: "0.1rem 0.5rem", borderRadius: 999, background: c.fundo, color: c.texto, fontSize: "0.75rem", fontWeight: 600, whiteSpace: "nowrap" }}>
      <span aria-hidden="true">{c.icone}</span>
      {status}
    </span>
  );
}

export default function Conformidade() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [projeto, setProjeto] = useState("");
  const [framework, setFramework] = useState<FrameworkId | "">("");
  const [situacao, setSituacao] = useState<"" | "pendentes" | "sem" | "lacunas">("");
  const [busca, setBusca] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [novo, setNovo] = useState<Record<number, { framework: FrameworkId; controleId: string; status: string }>>({});

  const carregar = useCallback(() => {
    fetch("/api/conformidade")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setDados(d);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar a conformidade."));
  }, []);
  useEffect(carregar, [carregar]);

  async function decidir(riscoId: number, fw: string, controleId: string, situacaoNova: "confirmado" | "descartado", status?: string, fonte?: string) {
    const k = `${riscoId}|${fw}|${controleId}`;
    setOcupado(k);
    setMsg(null);
    try {
      const r = await fetch("/api/conformidade/mapeamentos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riscoId, framework: fw, controleId, situacao: situacaoNova, status, fonte }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      carregar();
    } catch (e: any) {
      setMsg(e.message || "Erro ao gravar.");
    } finally {
      setOcupado(null);
    }
  }

  async function desfazer(riscoId: number, fw: string, controleId: string) {
    setOcupado(`${riscoId}|${fw}|${controleId}`);
    await fetch(`/api/conformidade/mapeamentos?riscoId=${riscoId}&framework=${fw}&controleId=${encodeURIComponent(controleId)}`, { method: "DELETE" }).catch(() => null);
    setOcupado(null);
    carregar();
  }

  const projetos = useMemo(() => {
    const m = new Map<string, string>();
    for (const i of dados?.riscos || []) if (i.projeto_id) m.set(String(i.projeto_id), i.projeto || "");
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [dados]);

  const filtrados = useMemo(() => {
    const q = normalizar(busca.trim());
    return (dados?.riscos || []).filter((i) => {
      if (projeto && String(i.projeto_id) !== projeto) return false;
      const conf = framework ? i.confirmados.filter((c) => c.framework === framework) : i.confirmados;
      const sug = framework ? i.sugestoes.filter((c) => c.framework === framework) : i.sugestoes;
      if (situacao === "pendentes" && sug.length === 0) return false;
      if (situacao === "sem" && conf.length > 0) return false;
      if (situacao === "lacunas" && !conf.some((c) => c.status !== "Implementado")) return false;
      if (q) {
        const alvo = normalizar([i.id, i.titulo || i.gatilho, i.categoria, i.projeto, i.cenario, ...conf.map((c) => c.controle_id), ...sug.map((c) => c.id)].join(" "));
        if (!alvo.includes(q)) return false;
      }
      return true;
    });
  }, [dados, projeto, framework, situacao, busca]);

  // Lacunas: controles cujo pior status é Ausente ou Parcial, com os riscos que dependem deles.
  const lacunas = useMemo(() => {
    const m = new Map<string, { fw: FrameworkId; id: string; titulo: string; pior: string; riscos: number[] }>();
    const peso: Record<string, number> = { Implementado: 2, Parcial: 1, Ausente: 0 };
    for (const i of dados?.riscos || []) {
      for (const c of i.confirmados) {
        if (framework && c.framework !== framework) continue;
        const k = `${c.framework}|${c.controle_id}`;
        const atual = m.get(k) ?? { fw: c.framework, id: c.controle_id, titulo: c.controle_titulo, pior: c.status, riscos: [] };
        if (peso[c.status] < peso[atual.pior]) atual.pior = c.status;
        atual.riscos.push(i.id);
        m.set(k, atual);
      }
    }
    return [...m.values()]
      .filter((x) => x.pior !== "Implementado")
      .sort((a, b) => peso[a.pior] - peso[b.pior] || b.riscos.length - a.riscos.length)
      .slice(0, 8);
  }, [dados, framework]);

  const pendentes = (dados?.riscos || []).reduce((t, i) => t + i.sugestoes.length, 0);
  const riscosPendentes = (dados?.riscos || []).filter((i) => i.sugestoes.length > 0).length;
  const fwsVisiveis = framework ? [framework] : IDS;
  const podeEditar = !!dados?.podeEditar;

  return (
    <>
      <section className="content-block">
        <div className={`container ${s.pagina}`}>
          <header className={s.topo}>
            <div>
              <span className="eyebrow">Conformidade</span>
              <h1>Conformidade com frameworks</h1>
              <p className={s.subtitulo}>
                Controles do CIS Controls v8.1, do NIST CSF 2.0 e da ISO/IEC 27001:2022 ligados a cada risco ativo. As
                palavras-chave e a biblioteca de cenários apenas sugerem; cada controle é confirmado com o seu status ou
                descartado. A cobertura considera só o que foi confirmado.
              </p>
            </div>
            <span className={s.selo}>Mapeamento curado</span>
          </header>

          {erro && (
            <div className="error-banner">
              <span className="success-icon error-icon">!</span>
              <span className="success-text">{erro}</span>
            </div>
          )}
          {msg && <div className="error-banner"><span className="success-text">{msg}</span></div>}
          {!dados && !erro && <p className="text-muted">Carregando...</p>}

          {dados && (
            <>
              <section className={s.resumo} aria-label="Cobertura por framework">
                {dados.cobertura.map((c) => (
                  <div key={c.framework} className={s.kpi}>
                    <span className={s.kpiRotulo}>Cobertura · {nomeFw(c.framework)}</span>
                    <span className={s.kpiValor}>{c.percentual === null ? "—" : `${c.percentual}%`}</span>
                    <span
                      style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", background: "var(--border)", margin: "0.35rem 0" }}
                      role="img"
                      aria-label={`${c.implementado} implementados, ${c.parcial} parciais, ${c.ausente} ausentes`}
                    >
                      {c.controles > 0 && (
                        <>
                          <span style={{ width: `${(c.implementado / c.controles) * 100}%`, background: "var(--success)" }} />
                          <span style={{ width: `${(c.parcial / c.controles) * 100}%`, background: "var(--warning)" }} />
                          <span style={{ width: `${(c.ausente / c.controles) * 100}%`, background: "var(--danger)" }} />
                        </>
                      )}
                    </span>
                    <span className={s.kpiNota}>
                      {c.controles
                        ? `${c.controles} controles: ${c.implementado} implementados, ${c.parcial} parciais, ${c.ausente} ausentes`
                        : "nenhum controle confirmado"}
                    </span>
                  </div>
                ))}
                <div className={s.kpi}>
                  <span className={s.kpiRotulo}>Sugestões a revisar</span>
                  <span className={s.kpiValor}>{pendentes}</span>
                  <span className={s.kpiNota}>em {riscosPendentes} risco{riscosPendentes === 1 ? "" : "s"}</span>
                </div>
              </section>

              {lacunas.length > 0 && (
                <section className={s.painel} aria-label="Principais lacunas">
                  <h2 className={s.painelTitulo}>Principais lacunas (controles ausentes ou parciais)</h2>
                  <div className="dash-table-scroll">
                    <table className="dash-table">
                      <thead><tr><th>Controle</th><th>Pior status</th><th>Riscos que dependem dele</th></tr></thead>
                      <tbody>
                        {lacunas.map((l) => (
                          <tr key={`${l.fw}|${l.id}`}>
                            <td style={{ whiteSpace: "normal", minWidth: "16rem" }}>
                              <span className={s.controleId}>{l.id}</span> {l.titulo}
                              <div className="text-muted" style={{ fontSize: "0.72rem" }}>{nomeFw(l.fw)}</div>
                            </td>
                            <td><SeloStatus status={l.pior} /></td>
                            <td>{l.riscos.map((r) => `#${r}`).join(", ")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              <section className={s.filtros} aria-label="Filtros">
                <div className="form-field">
                  <label htmlFor="confProjeto">Projeto</label>
                  <select id="confProjeto" value={projeto} onChange={(e) => setProjeto(e.target.value)}>
                    <option value="">Todos os projetos</option>
                    {projetos.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="confFw">Framework</label>
                  <select id="confFw" value={framework} onChange={(e) => setFramework(e.target.value as FrameworkId | "")}>
                    <option value="">Os três</option>
                    {IDS.map((fw) => <option key={fw} value={fw}>{nomeFw(fw)}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="confSit">Situação</label>
                  <select id="confSit" value={situacao} onChange={(e) => setSituacao(e.target.value as typeof situacao)}>
                    <option value="">Todos os riscos</option>
                    <option value="pendentes">Com sugestões a revisar</option>
                    <option value="lacunas">Com controle ausente ou parcial</option>
                    <option value="sem">Sem controle confirmado</option>
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="confBusca">Buscar</label>
                  <input id="confBusca" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Risco, cenário ou controle (ex.: A.8.8)" />
                </div>
              </section>

              <p className={s.contagem}>{filtrados.length} risco{filtrados.length === 1 ? "" : "s"} ativo{filtrados.length === 1 ? "" : "s"}</p>

              <div className={s.lista}>
                {filtrados.map((i) => {
                  const conf = i.confirmados.filter((c) => fwsVisiveis.includes(c.framework));
                  const sug = i.sugestoes.filter((c) => fwsVisiveis.includes(c.framework));
                  const n = novo[i.id] ?? { framework: (framework || "iso") as FrameworkId, controleId: "", status: "Ausente" };
                  return (
                    <article key={i.id} className={s.card}>
                      <header className={s.cardTopo}>
                        <div className={s.cardTitulos}>
                          <Link href={`${BASE}/riscos/${i.id}`} className={s.riscoTitulo}>
                            #{i.id} · {i.titulo || i.gatilho || "Risco sem descrição"}
                          </Link>
                          <span className={s.meta}>
                            {[i.projeto, i.categoria, i.cenario ? `cenário ${i.cenario}` : null, i.status].filter(Boolean).join(" · ")}
                          </span>
                        </div>
                        {i.nivel && <span className={`badge ${BADGE_POR_NIVEL[i.nivel] || ""}`}>{i.nivel}</span>}
                      </header>

                      <h3 className={s.colunaTitulo} style={{ marginTop: "0.75rem" }}>Controles confirmados</h3>
                      {conf.length === 0 ? (
                        <p className={s.semControle}>Nenhum controle confirmado{sug.length ? " — revise as sugestões abaixo" : ""}.</p>
                      ) : (
                        <ul className={s.controles}>
                          {conf.map((c) => {
                            const k = `${i.id}|${c.framework}|${c.controle_id}`;
                            return (
                              <li key={k} style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                                <span className={s.controleId}>{c.controle_id}</span>
                                <span style={{ flex: "1 1 14rem" }}>
                                  {c.controle_titulo}
                                  <span className="text-muted" style={{ fontSize: "0.72rem" }}> · {nomeFw(c.framework)}{c.fonte === "biblioteca" ? " · da biblioteca" : ""}</span>
                                </span>
                                {podeEditar ? (
                                  <select
                                    aria-label={`Status de ${c.controle_id} no risco ${i.id}`}
                                    value={c.status}
                                    disabled={ocupado === k}
                                    onChange={(e) => decidir(i.id, c.framework, c.controle_id, "confirmado", e.target.value, c.fonte)}
                                    style={{ background: COR_STATUS[c.status].fundo, color: COR_STATUS[c.status].texto, fontWeight: 600, borderRadius: 999, padding: "0.15rem 0.5rem", fontSize: "0.78rem" }}
                                  >
                                    {STATUS_CONTROLE.map((st) => <option key={st}>{st}</option>)}
                                  </select>
                                ) : (
                                  <SeloStatus status={c.status} />
                                )}
                                {podeEditar && (
                                  <button type="button" className="status-tag" disabled={ocupado === k} onClick={() => desfazer(i.id, c.framework, c.controle_id)} title="Volta a ser sugestão">
                                    desfazer
                                  </button>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {sug.length > 0 && (
                        <details open={conf.length === 0} style={{ marginTop: "0.75rem" }}>
                          <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>
                            {sug.length} sugest{sug.length === 1 ? "ão" : "ões"} a revisar
                            {sug.some((x) => x.fonte === "biblioteca") ? " (inclui a biblioteca do cenário)" : ""}
                          </summary>
                          <ul className={s.controles} style={{ marginTop: "0.5rem" }}>
                            {sug.map((c) => {
                              const k = `${i.id}|${c.framework}|${c.id}`;
                              return (
                                <li key={k} style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center", opacity: ocupado === k ? 0.5 : 1 }}>
                                  <span className={s.controleId}>{c.id}</span>
                                  <span style={{ flex: "1 1 14rem" }}>
                                    {c.titulo}
                                    <span className="text-muted" style={{ fontSize: "0.72rem", display: "block" }}>
                                      {nomeFw(c.framework)} · {c.fonte === "biblioteca" ? "biblioteca" : "palavra-chave"}: {c.motivo}
                                    </span>
                                  </span>
                                  {podeEditar && (
                                    <span style={{ display: "inline-flex", gap: "0.3rem", flexWrap: "wrap" }}>
                                      {STATUS_CONTROLE.map((st) => (
                                        <button
                                          key={st}
                                          type="button"
                                          className="status-tag"
                                          disabled={!!ocupado}
                                          title={`Confirmar como ${st}`}
                                          onClick={() => decidir(i.id, c.framework, c.id, "confirmado", st, c.fonte)}
                                          style={{ color: COR_STATUS[st].texto }}
                                        >
                                          {COR_STATUS[st].icone} {st}
                                        </button>
                                      ))}
                                      <button type="button" className="status-tag" disabled={!!ocupado} title="Não se aplica a este risco" onClick={() => decidir(i.id, c.framework, c.id, "descartado", undefined, c.fonte)}>
                                        descartar
                                      </button>
                                    </span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </details>
                      )}

                      {podeEditar && (
                        <details style={{ marginTop: "0.6rem" }}>
                          <summary style={{ cursor: "pointer", fontSize: "0.82rem", color: "var(--accent)" }}>+ adicionar controle</summary>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "flex-end", marginTop: "0.5rem" }}>
                            <select aria-label="Framework" value={n.framework} onChange={(e) => setNovo({ ...novo, [i.id]: { ...n, framework: e.target.value as FrameworkId, controleId: "" } })}>
                              {IDS.map((fw) => <option key={fw} value={fw}>{nomeFw(fw)}</option>)}
                            </select>
                            <select aria-label="Controle" value={n.controleId} onChange={(e) => setNovo({ ...novo, [i.id]: { ...n, controleId: e.target.value } })} style={{ maxWidth: "22rem" }}>
                              <option value="">Escolha o controle</option>
                              {dados.catalogo[n.framework].map((c) => <option key={c.id} value={c.id}>{c.id} · {c.titulo}</option>)}
                            </select>
                            <select aria-label="Status" value={n.status} onChange={(e) => setNovo({ ...novo, [i.id]: { ...n, status: e.target.value } })}>
                              {STATUS_CONTROLE.map((st) => <option key={st}>{st}</option>)}
                            </select>
                            <button
                              type="button"
                              className="btn-primary"
                              disabled={!n.controleId || !!ocupado}
                              onClick={() => decidir(i.id, n.framework, n.controleId, "confirmado", n.status, "manual")}
                            >
                              Confirmar
                            </button>
                          </div>
                        </details>
                      )}
                      {i.descartados > 0 && <p className="text-muted" style={{ fontSize: "0.72rem", margin: "0.5rem 0 0" }}>{i.descartados} sugestão(ões) descartada(s).</p>}
                    </article>
                  );
                })}
              </div>

              <p className={s.nota}>
                Os títulos dos controles são resumos em português; consulte o texto oficial de cada framework. A biblioteca de
                controles de cada cenário é revisada na tela do cenário (Catálogo de cenários). CIS Controls® é marca do Center for
                Internet Security.
              </p>
            </>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
