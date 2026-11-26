"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import { usePerfilRiscos } from "@/components/riscos/PermissoesRiscos";
import { MiniGrafico, SeloFaixa } from "@/components/riscos/KriVisual";
import {
  FREQUENCIAS_KRI,
  ROTULO_DIRECAO,
  ROTULO_SITUACAO_MEDICAO,
  fmt,
  situacaoMedicao,
  textoLimites,
  validarKri,
  type DirecaoKri,
  type FaixaKri,
} from "@/lib/kriRisco";
import { hojeSaoPaulo } from "@/lib/revisaoRisco";

// B21 · Indicadores-chave de risco (KRIs): lista com a última medição e a
// tendência, cadastro a partir do ponto de gatilho de um risco e importação
// de medições por CSV.

const BASE = "/seguranca/gestao-de-riscos";

type Kri = {
  id: number;
  codigo: string;
  nome: string;
  metrica: string;
  unidade: string;
  direcao: DirecaoKri;
  limite_amarelo: number;
  limite_vermelho: number;
  fonte: string;
  frequencia: string;
  risco_id: number;
  risco_titulo: string | null;
  risco_gatilho: string | null;
  projeto: string;
  ativo: boolean;
  ultima_referencia: string | null;
  ultimo_valor: number | null;
  ultima_faixa: FaixaKri | null;
  historico: { referencia: string; valor: number; faixa: FaixaKri }[];
};

type RiscoOpcao = { id: number; projeto: string; titulo: string | null; gatilho: string | null; status: string | null };

type Filtro = "" | FaixaKri | "sem_medicao" | "atrasada";

const VAZIO = {
  riscoId: "",
  nome: "",
  metrica: "",
  unidade: "",
  direcao: "maior_pior" as DirecaoKri,
  limiteAmarelo: "",
  limiteVermelho: "",
  fonte: "",
  frequencia: "Mensal",
};

function data(d: string | null) {
  return d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "—";
}

export default function Kris() {
  const perfil = usePerfilRiscos();
  const podeEditar = perfil.permissoes.editarRiscos;
  const [kris, setKris] = useState<Kri[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("");
  const [msg, setMsg] = useState<string | null>(null);

  const [form, setForm] = useState<typeof VAZIO | null>(null);
  const [riscos, setRiscos] = useState<RiscoOpcao[]>([]);
  const [enviando, setEnviando] = useState(false);

  const [csv, setCsv] = useState<{ nome: string; texto: string } | null>(null);
  const [previa, setPrevia] = useState<{ validas: number; erros: string[] } | null>(null);

  const hoje = hojeSaoPaulo();

  const carregar = useCallback(() => {
    fetch("/api/kris")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setKris(d.kris || []);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar os KRIs."));
  }, []);
  useEffect(carregar, [carregar]);

  // ?faixa=vermelho (menu) e ?novo=ID (atalho da tela do risco).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const f = p.get("faixa");
    if (f === "vermelho" || f === "amarelo" || f === "verde") setFiltro(f);
    const novo = p.get("novo");
    if (novo && /^\d+$/.test(novo)) abrirForm(novo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function abrirForm(riscoId = "") {
    setMsg(null);
    fetch("/api/riscos")
      .then((r) => r.json())
      .then((d) => {
        const lista: RiscoOpcao[] = (d.riscos || []).filter((r: RiscoOpcao) => r.status !== "Mitigado");
        setRiscos(lista);
        const r = lista.find((x) => String(x.id) === riscoId);
        setForm({ ...VAZIO, riscoId, nome: r?.gatilho ? r.gatilho.slice(0, 120) : "" });
      })
      .catch(() => setForm({ ...VAZIO, riscoId }));
  }

  function escolherRisco(id: string) {
    const r = riscos.find((x) => String(x.id) === id);
    setForm((f) => f && { ...f, riscoId: id, nome: f.nome || (r?.gatilho ?? "").slice(0, 120) });
  }

  const erroForm = form ? validarKri(form) : null;
  const riscoEscolhido = form ? riscos.find((r) => String(r.id) === form.riscoId) : undefined;

  async function salvar() {
    if (!form) return;
    setEnviando(true);
    try {
      const r = await fetch("/api/kris", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setForm(null);
      setMsg(`${d.kri.codigo} cadastrado. Registre a primeira medição na tela do indicador.`);
      carregar();
    } catch (e: any) {
      setMsg(e.message || "Erro ao cadastrar.");
    } finally {
      setEnviando(false);
    }
  }

  async function lerArquivo(f: File | undefined) {
    setPrevia(null);
    if (!f) return setCsv(null);
    const texto = await f.text();
    setCsv({ nome: f.name, texto });
    const r = await fetch("/api/kris/importar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto, simular: true }) });
    const d = await r.json();
    setPrevia(r.ok ? d : { validas: 0, erros: [d.error] });
  }

  async function importar() {
    if (!csv) return;
    setEnviando(true);
    try {
      const r = await fetch("/api/kris/importar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto: csv.texto }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMsg(
        `${d.gravadas} medição(ões) importada(s) de ${csv.nome}` +
          (d.vermelhos ? `; ${d.vermelhos} no vermelho` : "") +
          (d.revisoesAntecipadas ? `; ${d.revisoesAntecipadas} risco(s) com revisão antecipada` : "") +
          (d.erros?.length ? `; ${d.erros.length} linha(s) ignorada(s).` : ".")
      );
      setCsv(null);
      setPrevia(null);
      carregar();
    } catch (e: any) {
      setMsg(e.message || "Erro ao importar.");
    } finally {
      setEnviando(false);
    }
  }

  const contagem = useMemo(() => {
    const c = { vermelho: 0, amarelo: 0, verde: 0, sem_medicao: 0, atrasada: 0 };
    for (const k of (kris ?? []).filter((k) => k.ativo)) {
      if (k.ultima_faixa) c[k.ultima_faixa]++;
      const s = situacaoMedicao(k.ultima_referencia, k.frequencia, hoje);
      if (s !== "em_dia") c[s]++;
    }
    return c;
  }, [kris, hoje]);

  const visiveis = (kris ?? []).filter((k) => {
    if (!filtro) return true;
    if (filtro === "sem_medicao" || filtro === "atrasada") return k.ativo && situacaoMedicao(k.ultima_referencia, k.frequencia, hoje) === filtro;
    return k.ativo && k.ultima_faixa === filtro;
  });

  const cartoes: { chave: Filtro; rotulo: string; n: number; cor?: string }[] = [
    { chave: "vermelho", rotulo: "No vermelho", n: contagem.vermelho, cor: "var(--danger)" },
    { chave: "amarelo", rotulo: "No amarelo", n: contagem.amarelo, cor: "var(--warning-text)" },
    { chave: "verde", rotulo: "No verde", n: contagem.verde, cor: "var(--success)" },
    { chave: "atrasada", rotulo: "Medição atrasada", n: contagem.atrasada },
    { chave: "sem_medicao", rotulo: "Sem medição", n: contagem.sem_medicao },
  ];

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos</span>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem" }}>
            <div>
              <h1>Indicadores-chave de risco (KRIs)</h1>
              <p className="lede">
                Sinais medidos periodicamente que avisam quando um risco está se materializando. Cada KRI nasce do
                ponto de gatilho de um risco, com limiares amarelo e vermelho; uma medição no vermelho antecipa a
                revisão do risco vinculado.
              </p>
            </div>
            {podeEditar && !form && (
              <button className="btn-primary" onClick={() => abrirForm()}>+ Novo KRI</button>
            )}
          </div>

          {msg && (
            <div className="dash-panel" style={{ marginTop: "1.5rem", borderLeft: "4px solid var(--accent)" }}>
              <div className="dash-panel-body">{msg}</div>
            </div>
          )}

          {form && (
            <div className="dash-panel" style={{ marginTop: "1.5rem" }}>
              <div className="dash-panel-header">Novo KRI</div>
              <div className="dash-panel-body">
                <div className="form-field">
                  <label htmlFor="kriRisco">Risco vinculado</label>
                  <select id="kriRisco" value={form.riscoId} onChange={(e) => escolherRisco(e.target.value)}>
                    <option value="">Selecione o risco</option>
                    {riscos.map((r) => (
                      <option key={r.id} value={r.id}>#{r.id} · {r.projeto} · {(r.titulo || r.gatilho || "").slice(0, 90)}</option>
                    ))}
                  </select>
                  {riscoEscolhido?.gatilho && (
                    <p className="field-helper">Ponto de gatilho do risco: “{riscoEscolhido.gatilho}”</p>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))", gap: "0 1rem" }}>
                  <div className="form-field">
                    <label htmlFor="kriNome">Nome do indicador</label>
                    <input id="kriNome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: CVEs críticas em aberto há mais de 15 dias" />
                  </div>
                  <div className="form-field">
                    <label htmlFor="kriUnidade">Unidade</label>
                    <input id="kriUnidade" value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} placeholder="Ex.: CVEs, %, horas" />
                  </div>
                </div>
                <div className="form-field">
                  <label htmlFor="kriMetrica">Métrica (o que é medido e como)</label>
                  <textarea id="kriMetrica" rows={2} value={form.metrica} onChange={(e) => setForm({ ...form, metrica: e.target.value })} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(11rem, 1fr))", gap: "0 1rem" }}>
                  <div className="form-field">
                    <label htmlFor="kriDirecao">Direção</label>
                    <select id="kriDirecao" value={form.direcao} onChange={(e) => setForm({ ...form, direcao: e.target.value as DirecaoKri })}>
                      {(Object.keys(ROTULO_DIRECAO) as DirecaoKri[]).map((d) => <option key={d} value={d}>{ROTULO_DIRECAO[d]}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor="kriAmarelo">Limiar amarelo ({form.direcao === "menor_pior" ? "≤" : "≥"})</label>
                    <input id="kriAmarelo" inputMode="decimal" value={form.limiteAmarelo} onChange={(e) => setForm({ ...form, limiteAmarelo: e.target.value })} />
                  </div>
                  <div className="form-field">
                    <label htmlFor="kriVermelho">Limiar vermelho ({form.direcao === "menor_pior" ? "≤" : "≥"})</label>
                    <input id="kriVermelho" inputMode="decimal" value={form.limiteVermelho} onChange={(e) => setForm({ ...form, limiteVermelho: e.target.value })} />
                  </div>
                  <div className="form-field">
                    <label htmlFor="kriFreq">Frequência</label>
                    <select id="kriFreq" value={form.frequencia} onChange={(e) => setForm({ ...form, frequencia: e.target.value })}>
                      {Object.keys(FREQUENCIAS_KRI).map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-field">
                  <label htmlFor="kriFonte">Fonte do dado</label>
                  <input id="kriFonte" value={form.fonte} onChange={(e) => setForm({ ...form, fonte: e.target.value })} placeholder="Ex.: relatório mensal da ferramenta de varredura" />
                </div>
                {erroForm && <p style={{ color: "var(--danger)", margin: "0 0 0.5rem" }}>{erroForm}</p>}
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button className="btn-primary" disabled={!!erroForm || enviando} onClick={salvar}>Cadastrar KRI</button>
                  <button className="status-tag" onClick={() => setForm(null)}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {kris && kris.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "2rem" }}>
              {cartoes.map((c) => (
                <button
                  key={c.chave}
                  type="button"
                  onClick={() => setFiltro(filtro === c.chave ? "" : c.chave)}
                  aria-pressed={filtro === c.chave}
                  style={{
                    padding: "0.6rem 1rem",
                    borderRadius: 12,
                    border: filtro === c.chave ? "2px solid var(--accent)" : "1px solid var(--border)",
                    background: "var(--surface)",
                    textAlign: "left",
                    cursor: "pointer",
                    minWidth: "8.5rem",
                  }}
                >
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: c.n ? c.cor : undefined }}>{c.n}</div>
                  <div className="text-muted" style={{ fontSize: "0.8rem" }}>{c.rotulo}</div>
                </button>
              ))}
            </div>
          )}

          {!kris && !erro && <p className="text-muted" style={{ marginTop: "2rem" }}>Carregando...</p>}
          {erro && <div className="error-banner" style={{ marginTop: "2rem" }}><span className="success-text">{erro}</span></div>}

          {kris && (
            <div className="dash-panel" style={{ marginTop: "1.5rem" }}>
              <div className="dash-panel-header">
                {visiveis.length} indicador{visiveis.length === 1 ? "" : "es"}
                {filtro && (
                  <button className="status-tag" style={{ marginLeft: "0.75rem" }} onClick={() => setFiltro("")}>limpar filtro</button>
                )}
              </div>
              <div className="dash-panel-body">
                {visiveis.length === 0 ? (
                  <p className="text-muted" style={{ margin: 0 }}>Nenhum KRI {filtro ? "neste filtro" : "cadastrado ainda"}.</p>
                ) : (
                  <div className="dash-table-scroll">
                    <table className="dash-table">
                      <thead>
                        <tr><th>KRI</th><th>Risco</th><th>Última medição</th><th>Faixa</th><th>Tendência</th><th>Frequência</th></tr>
                      </thead>
                      <tbody>
                        {visiveis.map((k) => {
                          const sit = situacaoMedicao(k.ultima_referencia, k.frequencia, hoje);
                          return (
                            <tr key={k.id} style={k.ativo ? (k.ultima_faixa === "vermelho" ? { boxShadow: "inset 4px 0 0 var(--danger)" } : undefined) : { opacity: 0.55 }}>
                              <td style={{ whiteSpace: "normal", minWidth: "14rem" }}>
                                <Link href={`${BASE}/kris/${k.id}`} style={{ color: "var(--accent)", fontWeight: 600 }}>{k.codigo}</Link> · {k.nome}
                                <div className="text-muted" style={{ fontSize: "0.75rem" }}>{textoLimites(k)}</div>
                              </td>
                              <td style={{ whiteSpace: "normal", minWidth: "14rem" }}>
                                <Link href={`${BASE}/riscos/${k.risco_id}#kris`} style={{ color: "var(--accent)" }}>#{k.risco_id}</Link>{" "}
                                {(k.risco_titulo || k.risco_gatilho || "").slice(0, 80)}
                                <div className="text-muted" style={{ fontSize: "0.75rem" }}>{k.projeto}</div>
                              </td>
                              <td>
                                {k.ultimo_valor !== null ? `${fmt(k.ultimo_valor)} ${k.unidade}` : "—"}
                                <div className="text-muted" style={{ fontSize: "0.75rem" }}>{data(k.ultima_referencia)}</div>
                              </td>
                              <td><SeloFaixa faixa={k.ultima_faixa} /></td>
                              <td><MiniGrafico pontos={k.historico} /></td>
                              <td>
                                {k.frequencia}
                                {k.ativo ? (
                                  <div style={{ fontSize: "0.75rem", color: sit === "em_dia" ? "var(--text-muted)" : "var(--danger)" }}>
                                    {ROTULO_SITUACAO_MEDICAO[sit]}
                                  </div>
                                ) : (
                                  <div className="text-muted" style={{ fontSize: "0.75rem" }}>inativo</div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {podeEditar && kris && kris.length > 0 && (
            <div className="dash-panel" style={{ marginTop: "1.5rem" }}>
              <div className="dash-panel-header">Importar medições (CSV)</div>
              <div className="dash-panel-body">
                <p className="text-muted" style={{ marginTop: 0, fontSize: "0.85rem" }}>
                  Uma medição por linha: <code>codigo;referencia;valor;observacao</code>, por exemplo{" "}
                  <code>KRI-001;30/11/2026;4;relatório da varredura</code>. Datas em DD/MM/AAAA, AAAA-MM-DD ou MM/AAAA.
                  Medição na mesma data de outra substitui o valor anterior.
                </p>
                <input type="file" accept=".csv,.txt,text/csv" onChange={(e) => lerArquivo(e.target.files?.[0])} />
                {previa && (
                  <div style={{ marginTop: "0.75rem" }}>
                    <p style={{ margin: "0 0 0.4rem" }}>
                      <strong>{previa.validas}</strong> medição(ões) válida(s){previa.erros.length ? `, ${previa.erros.length} com problema:` : "."}
                    </p>
                    {previa.erros.length > 0 && (
                      <ul style={{ margin: "0 0 0.5rem", color: "var(--danger)", fontSize: "0.85rem" }}>
                        {previa.erros.slice(0, 10).map((e) => <li key={e}>{e}</li>)}
                      </ul>
                    )}
                    <button className="btn-primary" disabled={!previa.validas || enviando} onClick={importar}>
                      Importar {previa.validas} medição(ões)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
