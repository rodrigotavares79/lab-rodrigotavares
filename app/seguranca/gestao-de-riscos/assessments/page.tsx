"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Footer from "@/components/Footer";
import { usePerfilRiscos } from "@/components/riscos/PermissoesRiscos";
import SolicitarProjeto from "@/components/riscos/SolicitarProjeto";
import { AREAS_ASSESSMENT, TIPOS_ASSESSMENT, faixaMaturidade, validarNovoAssessment } from "@/lib/assessmentRegras";
import s from "./assessments.module.css";

// B28 · Assessments de segurança: lista com progresso e criação de um novo
// assessment (escopo, projeto e áreas aplicáveis). Regras em
// lib/assessmentRegras.ts; permissões em docs/matriz-permissoes.md (B28).

const BASE = "/seguranca/gestao-de-riscos";

type Item = {
  id: number;
  codigo: string;
  titulo: string;
  tipo: string;
  status: string;
  areas: string[];
  analista_nome: string | null;
  revisor_nome: string | null;
  devolvido_motivo: string | null;
  projeto: string;
  data_inicio: string | null;
  ultima_atividade: string;
  perguntas: number;
  respondidas: number;
  riscos: number;
  maturidade_final: string | null;
};

type Projeto = { id: number; nome: string };

const VAZIO = { titulo: "", tipo: "Projeto", projetoId: "", escopo: "", objetivo: "", dataInicio: "", areas: [...AREAS_ASSESSMENT] as string[] };

const COR_STATUS: Record<string, string> = { Rascunho: "var(--text-muted)", "Em revisão": "var(--warning-text)", Concluído: "var(--success)" };

function dataBr(d: string | null) {
  if (!d) return "—";
  const iso = d.slice(0, 10);
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

export default function Assessments() {
  const perfil = usePerfilRiscos();
  const router = useRouter();
  const [itens, setItens] = useState<Item[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"" | "Rascunho" | "Em revisão" | "Concluído">("");
  const [form, setForm] = useState<typeof VAZIO | null>(null);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const carregar = useCallback(() => {
    fetch("/api/assessments")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setItens(d.assessments || []);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar os assessments."));
  }, []);
  useEffect(carregar, [carregar]);

  function abrirForm() {
    setMsg(null);
    setForm({ ...VAZIO });
    fetch("/api/projetos?ativos=1")
      .then((r) => r.json())
      .then((d) => setProjetos(d.projetos || []))
      .catch(() => setProjetos([]));
  }
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("novo") === "1") abrirForm();
  }, []);

  const erroForm = form ? validarNovoAssessment(form) : null;

  function alternarArea(a: string) {
    setForm((f) => f && { ...f, areas: f.areas.includes(a) ? f.areas.filter((x) => x !== a) : [...f.areas, a] });
  }

  async function criar() {
    if (!form) return;
    setEnviando(true);
    try {
      const r = await fetch("/api/assessments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      router.push(`${BASE}/assessments/${d.assessment.id}`);
    } catch (e: any) {
      setMsg(e.message || "Erro ao criar o assessment.");
      setEnviando(false);
    }
  }

  const contagem = { Rascunho: 0, "Em revisão": 0, Concluído: 0 } as Record<string, number>;
  (itens ?? []).forEach((i) => (contagem[i.status] = (contagem[i.status] ?? 0) + 1));
  const visiveis = (itens ?? []).filter((i) => !filtro || i.status === filtro);
  const podeCriar = perfil.permissoes.editarRiscos;

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos</span>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem" }}>
            <div>
              <h1>Assessments de segurança</h1>
              <p className="lede">
                Avaliações sob demanda de um ambiente, projeto ou área de negócio, com o questionário de 17 áreas,
                maturidade por área e riscos registrados a partir das respostas. Quem conduz não aprova o próprio assessment.
              </p>
            </div>
            {podeCriar && !form && <button className="btn-primary" onClick={abrirForm}>+ Novo assessment</button>}
          </div>

          {msg && (
            <div className="dash-panel" style={{ marginTop: "1.5rem", borderLeft: "4px solid var(--danger)" }}>
              <div className="dash-panel-body">{msg}</div>
            </div>
          )}

          {form && (
            <div className="dash-panel" style={{ marginTop: "1.5rem" }}>
              <div className="dash-panel-header">Novo assessment</div>
              <div className="dash-panel-body">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))", gap: "0 1rem" }}>
                  <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                    <label htmlFor="asTitulo">Título</label>
                    <input id="asTitulo" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex.: Assessment do novo ERP acadêmico" />
                  </div>
                  <div className="form-field">
                    <label htmlFor="asTipo">Tipo</label>
                    <select id="asTipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                      {TIPOS_ASSESSMENT.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor="asProjeto">Projeto</label>
                    <select id="asProjeto" value={form.projetoId} onChange={(e) => setForm({ ...form, projetoId: e.target.value })}>
                      <option value="">Selecione o projeto</option>
                      {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                    <SolicitarProjeto />
                  </div>
                  <div className="form-field">
                    <label htmlFor="asData">Data de início</label>
                    <input id="asData" type="date" value={form.dataInicio} onChange={(e) => setForm({ ...form, dataInicio: e.target.value })} />
                  </div>
                </div>
                <div className="form-field">
                  <label htmlFor="asEscopo">Escopo</label>
                  <textarea id="asEscopo" rows={2} value={form.escopo} onChange={(e) => setForm({ ...form, escopo: e.target.value })} placeholder="O que está dentro e fora da avaliação: sistemas, unidades, processos, período." />
                </div>
                <div className="form-field">
                  <label htmlFor="asObjetivo">Objetivo (opcional)</label>
                  <textarea id="asObjetivo" rows={2} value={form.objetivo} onChange={(e) => setForm({ ...form, objetivo: e.target.value })} placeholder="Por que este assessment está sendo feito e para quem é o relatório." />
                </div>
                <fieldset className="form-field" style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
                    Áreas aplicáveis ({form.areas.length} de {AREAS_ASSESSMENT.length})
                  </legend>
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <button type="button" className="status-tag" onClick={() => setForm({ ...form, areas: [...AREAS_ASSESSMENT] })}>Marcar todas</button>
                    <button type="button" className="status-tag" onClick={() => setForm({ ...form, areas: [] })}>Desmarcar todas</button>
                  </div>
                  <div className={s.areasGrade}>
                    {AREAS_ASSESSMENT.map((a) => (
                      <label key={a}>
                        <input type="checkbox" checked={form.areas.includes(a)} onChange={() => alternarArea(a)} />
                        {a}
                      </label>
                    ))}
                  </div>
                </fieldset>
                {erroForm && <p style={{ color: "var(--danger)", margin: "0 0 0.5rem" }}>{erroForm}</p>}
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button className="btn-primary" disabled={!!erroForm || enviando} onClick={criar}>{enviando ? "Criando..." : "Criar e começar"}</button>
                  <button className="status-tag" onClick={() => setForm(null)}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {itens && itens.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "2rem" }}>
              {(["Rascunho", "Em revisão", "Concluído"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFiltro(filtro === st ? "" : st)}
                  aria-pressed={filtro === st}
                  style={{
                    padding: "0.6rem 1rem",
                    borderRadius: 12,
                    border: filtro === st ? "2px solid var(--accent)" : "1px solid var(--border)",
                    background: "var(--surface)",
                    textAlign: "left",
                    cursor: "pointer",
                    minWidth: "8.5rem",
                  }}
                >
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: contagem[st] ? COR_STATUS[st] : undefined }}>{contagem[st]}</div>
                  <div className="text-muted" style={{ fontSize: "0.8rem" }}>{st}</div>
                </button>
              ))}
            </div>
          )}

          {!itens && !erro && <p className="text-muted" style={{ marginTop: "2rem" }}>Carregando...</p>}
          {erro && <div className="error-banner" style={{ marginTop: "2rem" }}><span className="success-text">{erro}</span></div>}

          {itens && (
            <div className="dash-panel" style={{ marginTop: "1.5rem" }}>
              <div className="dash-panel-header">
                {visiveis.length} assessment{visiveis.length === 1 ? "" : "s"}
                {filtro && <button className="status-tag" style={{ marginLeft: "0.75rem" }} onClick={() => setFiltro("")}>limpar filtro</button>}
              </div>
              <div className="dash-panel-body">
                {visiveis.length === 0 ? (
                  <p className="text-muted" style={{ margin: 0 }}>
                    {filtro ? "Nenhum assessment neste filtro." : podeCriar ? "Nenhum assessment ainda. Crie o primeiro pelo botão acima." : "Nenhum assessment ainda."}
                  </p>
                ) : (
                  <div className="dash-table-scroll">
                    <table className="dash-table">
                      <thead>
                        <tr><th>Assessment</th><th>Status</th><th>Progresso</th><th>Maturidade</th><th>Riscos</th><th>Analista</th><th>Atividade</th></tr>
                      </thead>
                      <tbody>
                        {visiveis.map((i) => {
                          const pct = i.perguntas ? Math.round((i.respondidas / i.perguntas) * 100) : 0;
                          const mat = i.maturidade_final !== null ? Number(i.maturidade_final) : null;
                          return (
                            <tr key={i.id}>
                              <td style={{ whiteSpace: "normal", minWidth: "16rem" }}>
                                <Link href={`${BASE}/assessments/${i.id}`} style={{ color: "var(--accent)", fontWeight: 600 }}>{i.codigo}</Link> · {i.titulo}
                                <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                                  {i.tipo} · {i.projeto} · {i.areas.length} área{i.areas.length === 1 ? "" : "s"}
                                </div>
                              </td>
                              <td>
                                <span style={{ color: COR_STATUS[i.status], fontWeight: 600 }}>{i.status}</span>
                                {i.status === "Rascunho" && i.devolvido_motivo && (
                                  <div style={{ fontSize: "0.75rem", color: "var(--danger)" }}>devolvido</div>
                                )}
                              </td>
                              <td style={{ minWidth: "9rem" }}>
                                <div className={s.barra} title={`${i.respondidas} de ${i.perguntas}`}>
                                  <span className={s.corDescritiva} style={{ width: `${pct}%` }} />
                                </div>
                                <div className="text-muted" style={{ fontSize: "0.75rem" }}>{i.respondidas} de {i.perguntas} ({pct}%)</div>
                              </td>
                              <td>
                                {mat !== null ? (
                                  <>
                                    <strong>{mat.toLocaleString("pt-BR")}%</strong>
                                    <div className="text-muted" style={{ fontSize: "0.75rem" }}>{faixaMaturidade(mat)}</div>
                                  </>
                                ) : (
                                  <span className="text-muted">—</span>
                                )}
                              </td>
                              <td>{i.riscos || <span className="text-muted">0</span>}</td>
                              <td>
                                {i.analista_nome || "—"}
                                {i.revisor_nome && i.status === "Concluído" && (
                                  <div className="text-muted" style={{ fontSize: "0.75rem" }}>revisado por {i.revisor_nome}</div>
                                )}
                              </td>
                              <td>{dataBr(i.ultima_atividade)}</td>
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
        </div>
      </section>
      <Footer />
    </>
  );
}
