"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Footer from "@/components/Footer";
import GraficoLinhas from "@/components/riscos/GraficoLinhas";
import { SeloFaixa } from "@/components/riscos/KriVisual";
import {
  FREQUENCIAS_KRI,
  ROTULO_DIRECAO,
  ROTULO_SITUACAO_MEDICAO,
  faixaKri,
  fmt,
  numero,
  situacaoMedicao,
  textoLimites,
  type DirecaoKri,
  type FaixaKri,
} from "@/lib/kriRisco";
import { hojeSaoPaulo } from "@/lib/revisaoRisco";

// B21 · Detalhe do KRI: limiares, evolução das medições (com as linhas dos
// limiares), registro de medição e histórico. Medição no vermelho antecipa a
// revisão do risco vinculado.

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
  risco_nivel: string | null;
  projeto: string;
  ativo: boolean;
  responsavel_nome: string | null;
  ultima_referencia: string | null;
  ultima_faixa: FaixaKri | null;
};

type Medicao = {
  id: number;
  referencia: string;
  valor: number;
  faixa: FaixaKri;
  origem: string;
  observacao: string | null;
  registrado_por_nome: string | null;
};

function data(d: string | null) {
  return d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "—";
}

export default function DetalheKri() {
  const { id } = useParams<{ id: string }>();
  const [kri, setKri] = useState<Kri | null>(null);
  const [medicoes, setMedicoes] = useState<Medicao[]>([]);
  const [podeEditar, setPodeEditar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ texto: string; alerta?: boolean } | null>(null);
  const [nova, setNova] = useState({ referencia: hojeSaoPaulo(), valor: "", observacao: "" });
  const [editando, setEditando] = useState<null | { limiteAmarelo: string; limiteVermelho: string; frequencia: string; fonte: string }>(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(() => {
    fetch(`/api/kris/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setKri(d.kri);
        setMedicoes(d.medicoes || []);
        setPodeEditar(!!d.podeEditar);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar o KRI."));
  }, [id]);
  useEffect(carregar, [carregar]);

  const valorNovo = numero(nova.valor);
  const faixaPrevia = kri && valorNovo !== null ? faixaKri(valorNovo, kri) : null;

  async function registrar() {
    setEnviando(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/kris/${id}/medicoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nova),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMsg(
        d.revisaoAntecipada
          ? { texto: `Medição no vermelho: a revisão do risco #${kri?.risco_id} foi antecipada e entrou na fila de revisões vencidas.`, alerta: true }
          : { texto: `Medição gravada (${d.faixa}).` }
      );
      setNova({ ...nova, valor: "", observacao: "" });
      carregar();
    } catch (e: any) {
      setMsg({ texto: e.message || "Erro ao gravar.", alerta: true });
    } finally {
      setEnviando(false);
    }
  }

  async function salvarEdicao(corpo: object) {
    setEnviando(true);
    try {
      const r = await fetch(`/api/kris/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setEditando(null);
      setMsg({ texto: "KRI atualizado. As medições anteriores mantêm a faixa da época." });
      carregar();
    } catch (e: any) {
      setMsg({ texto: e.message || "Erro ao salvar.", alerta: true });
    } finally {
      setEnviando(false);
    }
  }

  const ordenadas = [...medicoes].sort((a, b) => a.referencia.localeCompare(b.referencia));
  const sit = kri ? situacaoMedicao(kri.ultima_referencia, kri.frequencia, hojeSaoPaulo()) : null;
  const sinal = kri?.direcao === "menor_pior" ? "≤" : "≥";

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">
            <Link href={`${BASE}/kris`} style={{ color: "inherit" }}>Indicadores (KRIs)</Link>
          </span>
          {erro && <div className="error-banner" style={{ marginTop: "1rem" }}><span className="success-text">{erro}</span></div>}
          {!kri && !erro && <p className="text-muted">Carregando...</p>}
          {kri && (
            <>
              <h1 style={{ marginBottom: "0.25rem" }}>{kri.codigo} · {kri.nome}</h1>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", margin: "0.5rem 0 1rem" }}>
                <SeloFaixa faixa={kri.ultima_faixa} />
                {sit && kri.ativo && (
                  <span style={{ fontSize: "0.85rem", color: sit === "em_dia" ? "var(--text-muted)" : "var(--danger)" }}>
                    {ROTULO_SITUACAO_MEDICAO[sit]} · {kri.frequencia}
                  </span>
                )}
                {!kri.ativo && <span className="text-muted">Inativo</span>}
              </div>
              <p className="lede" style={{ marginTop: 0 }}>{kri.metrica}</p>

              {msg && (
                <div className="dash-panel" style={{ borderLeft: `4px solid ${msg.alerta ? "var(--danger)" : "var(--accent)"}` }}>
                  <div className="dash-panel-body">{msg.texto}</div>
                </div>
              )}

              <div className="dash-panel" style={{ marginTop: "1rem" }}>
                <div className="dash-panel-header">Definição</div>
                <div className="dash-panel-body">
                  <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))", gap: "0.75rem 1.5rem", margin: 0 }}>
                    <div><dt className="text-muted" style={{ fontSize: "0.75rem" }}>Risco vinculado</dt><dd style={{ margin: 0 }}>
                      <Link href={`${BASE}/riscos/${kri.risco_id}#kris`} style={{ color: "var(--accent)", fontWeight: 600 }}>#{kri.risco_id}</Link>{" "}
                      {(kri.risco_titulo || kri.risco_gatilho || "").slice(0, 120)}
                      <div className="text-muted" style={{ fontSize: "0.75rem" }}>{kri.projeto}{kri.risco_nivel ? ` · nível atual ${kri.risco_nivel}` : ""}</div>
                    </dd></div>
                    <div><dt className="text-muted" style={{ fontSize: "0.75rem" }}>Ponto de gatilho</dt><dd style={{ margin: 0 }}>{kri.risco_gatilho || "—"}</dd></div>
                    <div><dt className="text-muted" style={{ fontSize: "0.75rem" }}>Limiares</dt><dd style={{ margin: 0 }}>{textoLimites(kri)}<div className="text-muted" style={{ fontSize: "0.75rem" }}>{ROTULO_DIRECAO[kri.direcao]}</div></dd></div>
                    <div><dt className="text-muted" style={{ fontSize: "0.75rem" }}>Fonte · frequência</dt><dd style={{ margin: 0 }}>{kri.fonte} · {kri.frequencia}</dd></div>
                    <div><dt className="text-muted" style={{ fontSize: "0.75rem" }}>Responsável</dt><dd style={{ margin: 0 }}>{kri.responsavel_nome || "—"}</dd></div>
                  </dl>
                  {podeEditar && !editando && (
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                      <button className="status-tag" onClick={() => setEditando({ limiteAmarelo: String(kri.limite_amarelo), limiteVermelho: String(kri.limite_vermelho), frequencia: kri.frequencia, fonte: kri.fonte })}>
                        Ajustar limiares
                      </button>
                      <button className="status-tag" disabled={enviando} onClick={() => salvarEdicao({ ativo: !kri.ativo })}>
                        {kri.ativo ? "Inativar" : "Reativar"}
                      </button>
                    </div>
                  )}
                  {editando && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end", marginTop: "1rem" }}>
                      <div className="form-field" style={{ margin: 0 }}>
                        <label htmlFor="edAm">Amarelo ({sinal})</label>
                        <input id="edAm" inputMode="decimal" value={editando.limiteAmarelo} onChange={(e) => setEditando({ ...editando, limiteAmarelo: e.target.value })} />
                      </div>
                      <div className="form-field" style={{ margin: 0 }}>
                        <label htmlFor="edVe">Vermelho ({sinal})</label>
                        <input id="edVe" inputMode="decimal" value={editando.limiteVermelho} onChange={(e) => setEditando({ ...editando, limiteVermelho: e.target.value })} />
                      </div>
                      <div className="form-field" style={{ margin: 0 }}>
                        <label htmlFor="edFr">Frequência</label>
                        <select id="edFr" value={editando.frequencia} onChange={(e) => setEditando({ ...editando, frequencia: e.target.value })}>
                          {Object.keys(FREQUENCIAS_KRI).map((f) => <option key={f}>{f}</option>)}
                        </select>
                      </div>
                      <div className="form-field" style={{ margin: 0, flex: "1 1 14rem" }}>
                        <label htmlFor="edFo">Fonte</label>
                        <input id="edFo" value={editando.fonte} onChange={(e) => setEditando({ ...editando, fonte: e.target.value })} />
                      </div>
                      <button className="btn-primary" disabled={enviando} onClick={() => salvarEdicao(editando)}>Salvar</button>
                      <button className="status-tag" onClick={() => setEditando(null)}>Cancelar</button>
                    </div>
                  )}
                </div>
              </div>

              {ordenadas.length > 0 && (
                <div className="dash-panel" style={{ marginTop: "1.5rem" }}>
                  <div className="dash-panel-body">
                    <GraficoLinhas
                      titulo={`${kri.codigo}: medições e limiares (${kri.unidade})`}
                      meses={ordenadas.map((m) => `${m.referencia.slice(8, 10)}/${m.referencia.slice(5, 7)}/${m.referencia.slice(2, 4)}`)}
                      series={[
                        { nome: "Medido", cor: "#257de0", valores: ordenadas.map((m) => Number(m.valor)) },
                        { nome: "Amarelo", cor: "var(--warning)", valores: ordenadas.map(() => Number(kri.limite_amarelo)), tracejada: true },
                        { nome: "Vermelho", cor: "var(--danger)", valores: ordenadas.map(() => Number(kri.limite_vermelho)), tracejada: true },
                      ]}
                    />
                  </div>
                </div>
              )}

              {podeEditar && kri.ativo && (
                <div className="dash-panel" style={{ marginTop: "1.5rem" }}>
                  <div className="dash-panel-header">Registrar medição</div>
                  <div className="dash-panel-body">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end" }}>
                      <div className="form-field" style={{ margin: 0 }}>
                        <label htmlFor="mRef">Data de referência</label>
                        <input id="mRef" type="date" max={hojeSaoPaulo()} value={nova.referencia} onChange={(e) => setNova({ ...nova, referencia: e.target.value })} />
                      </div>
                      <div className="form-field" style={{ margin: 0 }}>
                        <label htmlFor="mVal">Valor ({kri.unidade})</label>
                        <input id="mVal" inputMode="decimal" value={nova.valor} onChange={(e) => setNova({ ...nova, valor: e.target.value })} />
                      </div>
                      <div className="form-field" style={{ margin: 0, flex: "1 1 16rem" }}>
                        <label htmlFor="mObs">Observação (opcional)</label>
                        <input id="mObs" value={nova.observacao} onChange={(e) => setNova({ ...nova, observacao: e.target.value })} />
                      </div>
                      <button className="btn-primary" disabled={valorNovo === null || !nova.referencia || enviando} onClick={registrar}>Gravar</button>
                    </div>
                    {faixaPrevia && (
                      <p className="field-helper" style={{ marginTop: "0.6rem" }}>
                        Este valor fica <SeloFaixa faixa={faixaPrevia} />
                        {faixaPrevia === "vermelho" && " e antecipa a revisão do risco vinculado."}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="dash-panel" style={{ marginTop: "1.5rem" }}>
                <div className="dash-panel-header">Histórico · {medicoes.length} medição(ões)</div>
                <div className="dash-panel-body">
                  {medicoes.length === 0 ? (
                    <p className="text-muted" style={{ margin: 0 }}>Nenhuma medição ainda.</p>
                  ) : (
                    <div className="dash-table-scroll">
                      <table className="dash-table">
                        <thead><tr><th>Referência</th><th>Valor</th><th>Faixa</th><th>Origem</th><th>Registrado por</th><th>Observação</th></tr></thead>
                        <tbody>
                          {medicoes.map((m) => (
                            <tr key={m.id}>
                              <td>{data(m.referencia)}</td>
                              <td>{fmt(m.valor)} {kri.unidade}</td>
                              <td><SeloFaixa faixa={m.faixa} /></td>
                              <td>{m.origem === "importado" ? "Importado (CSV)" : "Manual"}</td>
                              <td>{m.registrado_por_nome || "—"}</td>
                              <td style={{ whiteSpace: "normal", minWidth: "12rem" }}>{m.observacao || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
