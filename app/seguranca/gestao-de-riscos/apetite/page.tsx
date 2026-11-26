"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import {
  NIVEIS_APETITE,
  diferencas,
  validarProposta,
  type LimiteCategoria,
  type SituacaoApetite,
} from "@/lib/apetiteRisco";

// B18 · Apetite e tolerância a risco por categoria. Mostra a versão vigente
// (com quantos riscos ativos estão dentro, acima do apetite e acima da
// tolerância), a proposta pendente com a decisão do CISO, o formulário para
// propor uma nova versão e o histórico de versões.

const BASE = "/seguranca/gestao-de-riscos";

type Versao = {
  id: number;
  versao: number;
  situacao: "Pendente" | "Vigente" | "Substituída" | "Recusada";
  justificativa: string;
  proposto_por_email: string;
  proposto_por_nome: string | null;
  proposto_em: string;
  decidido_por_nome: string | null;
  decidido_por_perfil: string | null;
  decidido_em: string | null;
  motivo_decisao: string | null;
  vigente_desde: string | null;
  vigente_ate: string | null;
  limites: LimiteCategoria[];
};

type Dados = {
  versoes: Versao[];
  categorias: string[];
  resumo: Record<string, Record<SituacaoApetite, number>>;
  podePropor: boolean;
  podeDecidir: boolean;
  eu: string;
};

const BADGE_POR_NIVEL: Record<string, string> = {
  Baixo: "badge-baixo",
  "Médio": "badge-medio",
  Alto: "badge-alto",
  "Crítico": "badge-critico",
};

const CATEGORIAS_PADRAO = [
  "Tecnológico",
  "Segurança da Informação",
  "Operacional",
  "Estratégico",
  "Financeiro",
  "Conformidade / Regulatório",
  "Reputacional",
];

function data(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("pt-BR") : "—";
}

function Nivel({ n }: { n: string }) {
  return <span className={`badge ${BADGE_POR_NIVEL[n] || ""}`}>{n}</span>;
}

function Contagem({ n, cor, rotulo }: { n: number; cor: string; rotulo: string }) {
  if (!n) return <span className="text-muted">0</span>;
  return (
    <Link href={`${BASE}/riscos?apetite=${rotulo}`} style={{ color: cor, fontWeight: 700 }}>
      {n}
    </Link>
  );
}

export default function ApetiteTolerancia() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [propondo, setPropondo] = useState(false);
  const [rascunho, setRascunho] = useState<LimiteCategoria[]>([]);
  const [justificativa, setJustificativa] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(() => {
    fetch("/api/apetite")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setDados(d);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar."));
  }, []);
  useEffect(carregar, [carregar]);

  const vigente = dados?.versoes.find((v) => v.situacao === "Vigente") ?? null;
  const pendente = dados?.versoes.find((v) => v.situacao === "Pendente") ?? null;
  const historico = (dados?.versoes ?? []).filter((v) => v.situacao !== "Pendente");

  // Linhas da tabela vigente: categorias com limite + categorias em uso sem limite.
  const linhasVigente = useMemo(() => {
    const cats = new Set<string>([...(vigente?.limites.map((l) => l.categoria) ?? []), ...(dados?.categorias ?? [])]);
    return [...cats]
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .map((c) => ({ categoria: c, limite: vigente?.limites.find((l) => l.categoria === c) ?? null }));
  }, [vigente, dados]);

  function abrirProposta() {
    const base = new Map((vigente?.limites ?? []).map((l) => [l.categoria, l]));
    const cats = new Set<string>([...base.keys(), ...(dados?.categorias ?? []).filter((c) => c !== "Sem categoria")]);
    if (cats.size === 0) CATEGORIAS_PADRAO.forEach((c) => cats.add(c));
    setRascunho(
      [...cats]
        .sort((a, b) => a.localeCompare(b, "pt-BR"))
        .map((c) => base.get(c) ?? { categoria: c, apetite: "Médio", tolerancia: "Alto" })
    );
    setJustificativa("");
    setPropondo(true);
    setMsg(null);
  }

  function mudar(i: number, campo: "apetite" | "tolerancia", valor: string) {
    setRascunho((r) => r.map((l, j) => (j === i ? { ...l, [campo]: valor } : l)));
  }

  const erroRascunho = propondo ? validarProposta({ justificativa, limites: rascunho }) : null;
  const mudancas = propondo ? diferencas(vigente?.limites ?? [], rascunho) : [];

  async function enviarProposta() {
    setEnviando(true);
    setMsg(null);
    try {
      const r = await fetch("/api/apetite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ justificativa, limites: rascunho }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setPropondo(false);
      setMsg(`Versão ${d.versao.versao} enviada para aprovação do CISO.`);
      carregar();
    } catch (e: any) {
      setMsg(e.message || "Erro ao enviar a proposta.");
    } finally {
      setEnviando(false);
    }
  }

  async function decidir(decisao: "Aprovar" | "Recusar") {
    if (!pendente) return;
    setEnviando(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/apetite/${pendente.id}/decisao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisao, motivo }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMotivo("");
      setMsg(decisao === "Aprovar" ? `Versão ${d.versao} aprovada e vigente.` : "Proposta recusada.");
      carregar();
    } catch (e: any) {
      setMsg(e.message || "Erro ao registrar a decisão.");
    } finally {
      setEnviando(false);
    }
  }

  const souProponente = !!pendente && !!dados && pendente.proposto_por_email.toLowerCase() === dados.eu.toLowerCase();

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos · Governança</span>
          <h1>Apetite e tolerância a risco</h1>
          <p className="lede">
            Quanto risco a organização aceita em cada categoria. <strong>Apetite</strong> é o nível aceito sem ação
            adicional; <strong>tolerância</strong> é o máximo suportado enquanto o risco é tratado. Cada risco é
            comparado pelo seu nível atual. Mudanças viram uma nova versão, que só vale depois de aprovada pelo CISO.
          </p>

          {!dados && !erro && <p className="text-muted" style={{ marginTop: "2rem" }}>Carregando...</p>}
          {erro && (
            <div className="error-banner" style={{ marginTop: "2rem" }}>
              <span className="success-icon error-icon">!</span>
              <span className="success-text">{erro}</span>
            </div>
          )}
          {msg && (
            <div className="dash-panel" style={{ marginTop: "1.5rem", borderLeft: "4px solid var(--accent)" }}>
              <div className="dash-panel-body">{msg}</div>
            </div>
          )}

          {dados && (
            <>
              <div className="dash-panel" style={{ marginTop: "2rem" }}>
                <div className="dash-panel-header">
                  {vigente
                    ? `Versão vigente: ${vigente.versao} · aprovada por ${vigente.decidido_por_nome ?? "—"} em ${data(vigente.decidido_em)}`
                    : "Nenhuma versão aprovada ainda"}
                </div>
                <div className="dash-panel-body">
                  <div className="dash-table-scroll">
                    <table className="dash-table">
                      <thead>
                        <tr>
                          <th>Categoria</th>
                          <th>Apetite (até)</th>
                          <th>Tolerância (até)</th>
                          <th>Dentro do apetite</th>
                          <th>▲ Acima do apetite</th>
                          <th>▲▲ Acima da tolerância</th>
                        </tr>
                      </thead>
                      <tbody>
                        {linhasVigente.map(({ categoria, limite }) => {
                          const r = dados.resumo[categoria];
                          return (
                            <tr key={categoria}>
                              <td>{categoria}</td>
                              <td>{limite ? <Nivel n={limite.apetite} /> : <span className="text-muted">sem limite</span>}</td>
                              <td>{limite ? <Nivel n={limite.tolerancia} /> : <span className="text-muted">sem limite</span>}</td>
                              <td>{r?.dentro ?? 0}</td>
                              <td><Contagem n={r?.acima_apetite ?? 0} cor="var(--warning-text)" rotulo="acima" /></td>
                              <td><Contagem n={r?.acima_tolerancia ?? 0} cor="var(--danger)" rotulo="acima-tolerancia" /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {vigente && (
                    <p className="field-helper" style={{ marginTop: "0.75rem" }}>
                      Motivo da versão {vigente.versao}: {vigente.justificativa}
                    </p>
                  )}
                </div>
              </div>

              {pendente && (
                <div className="dash-panel" style={{ marginTop: "1.5rem", borderLeft: "4px solid var(--warning)" }}>
                  <div className="dash-panel-header">
                    Versão {pendente.versao} aguardando aprovação · proposta por {pendente.proposto_por_nome ?? pendente.proposto_por_email} em{" "}
                    {data(pendente.proposto_em)}
                  </div>
                  <div className="dash-panel-body">
                    <p style={{ marginTop: 0 }}>{pendente.justificativa}</p>
                    <table className="dash-table">
                      <thead>
                        <tr><th>Categoria</th><th>Hoje (apetite / tolerância)</th><th>Proposta</th></tr>
                      </thead>
                      <tbody>
                        {diferencas(vigente?.limites ?? [], pendente.limites).map((d) => (
                          <tr key={d.categoria}>
                            <td>{d.categoria}</td>
                            <td>{d.antes ?? <span className="text-muted">sem limite</span>}</td>
                            <td style={{ fontWeight: 600 }}>{d.depois ?? <span className="text-muted">removida</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {diferencas(vigente?.limites ?? [], pendente.limites).length === 0 && (
                      <p className="text-muted">Mesmos limites da versão vigente (renovação).</p>
                    )}
                    {dados.podeDecidir && !souProponente ? (
                      <div style={{ marginTop: "1rem", display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end" }}>
                        <div className="form-field" style={{ flex: "1 1 20rem", margin: 0 }}>
                          <label htmlFor="motivoApetite">Comentário da decisão (obrigatório para recusar)</label>
                          <input id="motivoApetite" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                        </div>
                        <button className="btn-primary" disabled={enviando} onClick={() => decidir("Aprovar")}>
                          Aprovar versão {pendente.versao}
                        </button>
                        <button className="status-tag" disabled={enviando || !motivo.trim()} onClick={() => decidir("Recusar")}>
                          Recusar
                        </button>
                      </div>
                    ) : (
                      <p className="field-helper" style={{ marginTop: "1rem" }}>
                        {souProponente
                          ? "Você propôs esta versão: a decisão cabe ao CISO (segregação de funções)."
                          : "A decisão cabe ao CISO."}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {dados.podePropor && !pendente && !propondo && (
                <button className="btn-primary" style={{ marginTop: "1.5rem" }} onClick={abrirProposta}>
                  Propor nova versão
                </button>
              )}

              {propondo && (
                <div className="dash-panel" style={{ marginTop: "1.5rem" }}>
                  <div className="dash-panel-header">Nova versão (vai para aprovação do CISO)</div>
                  <div className="dash-panel-body">
                    <table className="dash-table">
                      <thead>
                        <tr><th>Categoria</th><th>Apetite (até)</th><th>Tolerância (até)</th></tr>
                      </thead>
                      <tbody>
                        {rascunho.map((l, i) => (
                          <tr key={l.categoria}>
                            <td>{l.categoria}</td>
                            {(["apetite", "tolerancia"] as const).map((campo) => (
                              <td key={campo}>
                                <select
                                  aria-label={`${campo === "apetite" ? "Apetite" : "Tolerância"} de ${l.categoria}`}
                                  value={l[campo]}
                                  onChange={(e) => mudar(i, campo, e.target.value)}
                                >
                                  {NIVEIS_APETITE.map((n) => (
                                    <option key={n} value={n}>{n}</option>
                                  ))}
                                </select>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="form-field" style={{ marginTop: "1rem" }}>
                      <label htmlFor="justApetite">Motivo da proposta</label>
                      <textarea
                        id="justApetite"
                        rows={3}
                        value={justificativa}
                        onChange={(e) => setJustificativa(e.target.value)}
                        placeholder="Ex.: após o incidente de ransomware, reduzir o apetite em Segurança da Informação."
                      />
                    </div>
                    <p className="field-helper">
                      {mudancas.length === 0
                        ? "Nenhuma categoria alterada em relação à versão vigente."
                        : `${mudancas.length} categoria${mudancas.length > 1 ? "s" : ""} alterada${mudancas.length > 1 ? "s" : ""}: ${mudancas.map((m) => m.categoria).join(", ")}.`}
                    </p>
                    {erroRascunho && <p style={{ color: "var(--danger)" }}>{erroRascunho}</p>}
                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                      <button className="btn-primary" disabled={!!erroRascunho || enviando} onClick={enviarProposta}>
                        Enviar para aprovação
                      </button>
                      <button className="status-tag" onClick={() => setPropondo(false)}>Cancelar</button>
                    </div>
                  </div>
                </div>
              )}

              {historico.length > 0 && (
                <div className="dash-panel" style={{ marginTop: "2rem" }}>
                  <div className="dash-panel-header">Histórico de versões</div>
                  <div className="dash-panel-body">
                    <div className="dash-table-scroll">
                      <table className="dash-table">
                        <thead>
                          <tr><th>Versão</th><th>Situação</th><th>Proposta por</th><th>Decisão</th><th>Vigência</th><th>Motivo</th></tr>
                        </thead>
                        <tbody>
                          {historico.map((v) => (
                            <tr key={v.id}>
                              <td>{v.versao}</td>
                              <td style={{ fontWeight: 600, color: v.situacao === "Vigente" ? "var(--success)" : v.situacao === "Recusada" ? "var(--danger)" : undefined }}>
                                {v.situacao}
                              </td>
                              <td>{v.proposto_por_nome ?? v.proposto_por_email}<div className="text-muted" style={{ fontSize: "0.75rem" }}>{data(v.proposto_em)}</div></td>
                              <td>
                                {v.decidido_por_nome ?? "—"}
                                {v.decidido_em && <div className="text-muted" style={{ fontSize: "0.75rem" }}>{data(v.decidido_em)}</div>}
                              </td>
                              <td>{v.vigente_desde ? `${data(v.vigente_desde)} a ${v.vigente_ate ? data(v.vigente_ate) : "hoje"}` : "—"}</td>
                              <td style={{ whiteSpace: "normal", minWidth: "16rem" }}>
                                {v.justificativa}
                                {v.motivo_decisao && <div className="text-muted" style={{ fontSize: "0.75rem" }}>Decisão: {v.motivo_decisao}</div>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
