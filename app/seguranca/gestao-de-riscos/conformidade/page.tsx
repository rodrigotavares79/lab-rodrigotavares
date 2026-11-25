"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import { FRAMEWORKS, type FrameworkId } from "@/lib/conformidadeFrameworks";
import s from "./conformidade.module.css";

// Conformidade: cada risco cadastrado é comparado, automaticamente, com os
// controles correspondentes em CIS Controls v8.1, NIST CSF 2.0 e ISO/IEC
// 27001:2022. Visível para todos os perfis e sem nenhuma edição.

const BASE = "/seguranca/gestao-de-riscos";

type Controle = { id: string; titulo: string };
type Item = {
  id: number;
  gatilho: string | null;
  titulo?: string | null;
  categoria: string | null;
  nivel: string | null;
  status: string | null;
  projeto_id: number | null;
  projeto: string | null;
  generico: boolean;
  temas: { id: string; nome: string; termos: string[] }[];
  cis: Controle[];
  nist: Controle[];
  iso: Controle[];
};

const IDS: FrameworkId[] = ["cis", "nist", "iso"];

const BADGE_POR_NIVEL: Record<string, string> = {
  Baixo: "badge-baixo",
  Médio: "badge-medio",
  Alto: "badge-alto",
  Crítico: "badge-critico",
};

function normalizar(t: string) {
  return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function contarControles(itens: Item[], fw: FrameworkId) {
  const m = new Map<string, { controle: Controle; n: number }>();
  for (const i of itens) {
    for (const c of i[fw]) {
      const atual = m.get(c.id);
      if (atual) atual.n++;
      else m.set(c.id, { controle: c, n: 1 });
    }
  }
  return [...m.values()].sort((a, b) => b.n - a.n || a.controle.id.localeCompare(b.controle.id, "pt-BR", { numeric: true }));
}

function ListaControles({ fw, controles }: { fw: FrameworkId; controles: Controle[] }) {
  return (
    <div className={s.coluna}>
      <h3 className={s.colunaTitulo}>
        {FRAMEWORKS[fw].nome} <span>{FRAMEWORKS[fw].versao}</span>
      </h3>
      {controles.length === 0 ? (
        <p className={s.semControle}>
          {fw === "cis" ? "Sem controle CIS equivalente (tema fora do escopo técnico do CIS)." : "Sem correspondência."}
        </p>
      ) : (
        <ul className={s.controles}>
          {controles.map((c) => (
            <li key={c.id}>
              <span className={s.controleId}>{c.id}</span>
              <span>{c.titulo}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Conformidade() {
  const [itens, setItens] = useState<Item[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [projeto, setProjeto] = useState("");
  const [tema, setTema] = useState("");
  const [framework, setFramework] = useState<FrameworkId | "">("");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    fetch("/api/conformidade")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setItens(d.riscos);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar a conformidade."));
  }, []);

  const projetos = useMemo(() => {
    const m = new Map<string, string>();
    for (const i of itens || []) if (i.projeto_id) m.set(String(i.projeto_id), i.projeto || "");
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [itens]);

  const temas = useMemo(() => {
    const m = new Map<string, string>();
    for (const i of itens || []) for (const t of i.temas) m.set(t.id, t.nome);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [itens]);

  const filtrados = useMemo(() => {
    const q = normalizar(busca.trim());
    return (itens || []).filter((i) => {
      if (projeto && String(i.projeto_id) !== projeto) return false;
      if (tema === "__generico" && !i.generico) return false;
      if (tema && tema !== "__generico" && !i.temas.some((t) => t.id === tema)) return false;
      if (q) {
        const alvo = normalizar(
          [i.id, i.titulo || i.gatilho, i.categoria, i.projeto, ...i.cis.map((c) => c.id), ...i.nist.map((c) => c.id), ...i.iso.map((c) => c.id)].join(" ")
        );
        if (!alvo.includes(q)) return false;
      }
      return true;
    });
  }, [itens, projeto, tema, busca]);

  const mapeados = filtrados.filter((i) => !i.generico).length;
  const fwsVisiveis = framework ? [framework] : IDS;

  return (
    <>
      <section className="content-block">
        <div className={`container ${s.pagina}`}>
          <header className={s.topo}>
            <div>
              <span className="eyebrow">Conformidade</span>
              <h1>Conformidade com frameworks</h1>
              <p className={s.subtitulo}>
                Cada risco cadastrado é comparado automaticamente com os controles correspondentes do CIS Controls v8.1,
                do NIST CSF 2.0 e da ISO/IEC 27001:2022.
              </p>
            </div>
            <span className={s.selo}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              Automático · somente leitura
            </span>
          </header>

          {erro && (
            <div className="error-banner">
              <span className="success-icon error-icon">!</span>
              <span className="success-text">{erro}</span>
            </div>
          )}

          {!itens && !erro && <p className="text-muted">Carregando...</p>}

          {itens && (
            <>
              <section className={s.resumo} aria-label="Resumo">
                <div className={s.kpi}>
                  <span className={s.kpiRotulo}>Riscos mapeados a temas</span>
                  <span className={s.kpiValor}>
                    {mapeados}
                    <small> de {filtrados.length}</small>
                  </span>
                  <span className={s.kpiNota}>
                    {filtrados.length - mapeados > 0
                      ? `${filtrados.length - mapeados} só com requisitos gerais de gestão de riscos`
                      : "todos com tema identificado"}
                  </span>
                </div>
                {IDS.map((fw) => (
                  <div key={fw} className={s.kpi}>
                    <span className={s.kpiRotulo}>
                      {FRAMEWORKS[fw].nome} {FRAMEWORKS[fw].versao.split(" ")[0]}
                    </span>
                    <span className={s.kpiValor}>{contarControles(filtrados, fw).length}</span>
                    <span className={s.kpiNota}>{fw === "nist" ? "subcategorias relacionadas" : "controles relacionados"}</span>
                  </div>
                ))}
              </section>

              <section className={s.painel} aria-label="Controles mais relacionados">
                <h2 className={s.painelTitulo}>Controles mais relacionados aos riscos</h2>
                <div className={s.topControles}>
                  {IDS.map((fw) => {
                    const lista = contarControles(filtrados, fw).slice(0, 5);
                    const max = Math.max(1, ...lista.map((l) => l.n));
                    return (
                      <div key={fw}>
                        <h3 className={s.colunaTitulo}>
                          {FRAMEWORKS[fw].nome} <span>{FRAMEWORKS[fw].versao}</span>
                        </h3>
                        <ul className={s.ranking}>
                          {lista.map((l) => (
                            <li key={l.controle.id} title={l.controle.titulo}>
                              <span className={s.rankingTopo}>
                                <span className={s.controleId}>{l.controle.id}</span>
                                <span className={s.rankingTitulo}>{l.controle.titulo}</span>
                                <strong>{l.n}</strong>
                              </span>
                              <span className={s.rankingTrilho}>
                                <span className={s.rankingBarra} style={{ width: `${(l.n / max) * 100}%` }} />
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className={s.filtros} aria-label="Filtros">
                <div className="form-field">
                  <label htmlFor="confProjeto">Projeto</label>
                  <select id="confProjeto" value={projeto} onChange={(e) => setProjeto(e.target.value)}>
                    <option value="">Todos os projetos</option>
                    {projetos.map(([id, nome]) => (
                      <option key={id} value={id}>
                        {nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="confTema">Tema</label>
                  <select id="confTema" value={tema} onChange={(e) => setTema(e.target.value)}>
                    <option value="">Todos os temas</option>
                    {temas.map(([id, nome]) => (
                      <option key={id} value={id}>
                        {nome}
                      </option>
                    ))}
                    <option value="__generico">Sem tema identificado</option>
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="confFw">Framework</label>
                  <select id="confFw" value={framework} onChange={(e) => setFramework(e.target.value as FrameworkId | "")}>
                    <option value="">Os três</option>
                    {IDS.map((fw) => (
                      <option key={fw} value={fw}>
                        {FRAMEWORKS[fw].nome} {FRAMEWORKS[fw].versao.split(" ")[0]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="confBusca">Buscar</label>
                  <input
                    id="confBusca"
                    type="search"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Risco, categoria ou controle (ex.: A.8.8)"
                  />
                </div>
              </section>

              <p className={s.contagem}>
                {filtrados.length} risco{filtrados.length === 1 ? "" : "s"}
              </p>

              <div className={s.lista}>
                {filtrados.map((i) => (
                  <article key={i.id} className={s.card}>
                    <header className={s.cardTopo}>
                      <div className={s.cardTitulos}>
                        <Link href={`${BASE}/riscos/${i.id}`} className={s.riscoTitulo}>
                          #{i.id} · {i.titulo || i.gatilho || "Risco sem descrição"}
                        </Link>
                        <span className={s.meta}>
                          {[i.projeto, i.categoria, i.status].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                      {i.nivel && <span className={`badge ${BADGE_POR_NIVEL[i.nivel] || ""}`}>{i.nivel}</span>}
                    </header>

                    <div className={s.temas}>
                      {i.generico ? (
                        <span className={`${s.tema} ${s.temaGenerico}`}>
                          Nenhum tema específico identificado — relacionado aos requisitos gerais de gestão de riscos
                        </span>
                      ) : (
                        i.temas.map((t) => (
                          <span key={t.id} className={s.tema} title={`Identificado por: ${t.termos.join(", ")}`}>
                            {t.nome}
                            <span className={s.termos}>{t.termos.join(", ")}</span>
                          </span>
                        ))
                      )}
                    </div>

                    <div className={`${s.colunas} ${framework ? s.colunasUma : ""}`}>
                      {fwsVisiveis.map((fw) => (
                        <ListaControles key={fw} fw={fw} controles={i[fw]} />
                      ))}
                    </div>
                  </article>
                ))}
              </div>

              <p className={s.nota}>
                Mapeamento automático e indicativo, feito a partir do texto de cada risco (gatilho, resultado potencial,
                categoria e fatores/controles cadastrados). Os títulos dos controles são resumos em português; consulte o
                texto oficial de cada framework. CIS Controls® é marca do Center for Internet Security.
              </p>
            </>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
