"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Footer from "@/components/Footer";
import {
  AREAS_ASSESSMENT,
  RESPOSTAS_OBJETIVAS,
  TIPOS_ASSESSMENT,
  calcularMaturidade,
  faixaMaturidade,
  respostaCompleta,
  validarNovoAssessment,
  type Pergunta,
} from "@/lib/assessmentRegras";
import s from "../assessments.module.css";

// B28 · Um assessment: cabeçalho, progresso e maturidade por área, fluxo de
// revisão e o questionário. Cada resposta é gravada sozinha (botão na hora,
// texto depois de uma pausa na digitação), então nada se perde ao fechar.

const BASE = "/seguranca/gestao-de-riscos";

type Campos = { resposta: string | null; descritivo: string; evidencia: string; entrevistados: string };
type Assessment = {
  id: number;
  codigo: string;
  titulo: string;
  tipo: string;
  projeto_id: number;
  projeto: string;
  escopo: string;
  objetivo: string | null;
  areas: string[];
  status: string;
  analista_email: string;
  analista_nome: string | null;
  data_inicio: string | null;
  enviado_revisao_em: string | null;
  revisor_nome: string | null;
  devolvido_motivo: string | null;
  concluido_em: string | null;
};
type Risco = { pergunta_id: number; risco_id: number; titulo: string | null; gatilho: string | null; status: string | null; impacto_qualitativo: string | null };
type Dados = {
  assessment: Assessment;
  perguntas: Pergunta[];
  respostas: { pergunta_id: number; resposta: string | null; descritivo: string | null; evidencia: string | null; entrevistados: string | null }[];
  riscos: Risco[];
  acoes: { editar: boolean; enviarRevisao: boolean; revisar: boolean };
};
type Estado = "salvando" | "salvo" | "erro";

const COR_STATUS: Record<string, string> = { Rascunho: "var(--text-muted)", "Em revisão": "var(--warning-text)", Concluído: "var(--success)" };

function dataBr(d: string | null) {
  if (!d) return "—";
  const iso = d.slice(0, 10);
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

function idArea(area: string) {
  return "area-" + (AREAS_ASSESSMENT as readonly string[]).indexOf(area);
}

export default function AssessmentDetalhe() {
  const { id } = useParams<{ id: string }>();
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [campos, setCampos] = useState<Record<number, Campos>>({});
  const [estado, setEstado] = useState<Record<number, Estado>>({});
  const [erroPergunta, setErroPergunta] = useState<Record<number, string>>({});
  const [busca, setBusca] = useState("");
  const [mostrar, setMostrar] = useState<"todas" | "pendentes" | "respondidas">("todas");
  const [motivo, setMotivo] = useState("");
  const [devolvendo, setDevolvendo] = useState(false);
  const [msg, setMsg] = useState<{ texto: string; ok: boolean } | null>(null);
  const [agindo, setAgindo] = useState(false);
  const [edicao, setEdicao] = useState<null | { titulo: string; tipo: string; projetoId: string; escopo: string; objetivo: string; dataInicio: string; areas: string[] }>(null);
  const [projetos, setProjetos] = useState<{ id: number; nome: string }[]>([]);
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const naoGravadas = useRef(new Set<number>());
  const camposRef = useRef(campos);
  camposRef.current = campos;

  const carregar = useCallback(() => {
    fetch(`/api/assessments/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setDados(d);
        const c: Record<number, Campos> = {};
        for (const r of d.respostas) c[r.pergunta_id] = { resposta: r.resposta, descritivo: r.descritivo ?? "", evidencia: r.evidencia ?? "", entrevistados: r.entrevistados ?? "" };
        setCampos(c);
      })
      .catch((e) => setErro(e.message || "Erro ao carregar o assessment."));
  }, [id]);
  useEffect(carregar, [carregar]);

  // Ao sair da página (navegação interna ou fechar a aba), grava na hora o
  // que ainda esperava a pausa da digitação.
  useEffect(() => {
    const avisar = (e: BeforeUnloadEvent) => {
      if (naoGravadas.current.size) {
        naoGravadas.current.forEach((pid) => salvarRef.current(pid, true));
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", avisar);
    return () => {
      window.removeEventListener("beforeunload", avisar);
      naoGravadas.current.forEach((pid) => salvarRef.current(pid, true));
    };
  }, []);

  const salvar = useCallback(
    async (perguntaId: number, saindo = false) => {
      clearTimeout(timers.current[perguntaId]);
      naoGravadas.current.delete(perguntaId);
      const c = camposRef.current[perguntaId];
      if (!c) return;
      setEstado((e) => ({ ...e, [perguntaId]: "salvando" }));
      try {
        const r = await fetch(`/api/assessments/${id}/respostas`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ perguntaId, ...c }),
          keepalive: saindo,
        });
        if (saindo) return;
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setEstado((e) => ({ ...e, [perguntaId]: "salvo" }));
        setErroPergunta(({ [perguntaId]: _, ...resto }) => resto);
      } catch (e: any) {
        setEstado((x) => ({ ...x, [perguntaId]: "erro" }));
        setErroPergunta((x) => ({ ...x, [perguntaId]: e.message || "Não foi possível gravar." }));
      }
    },
    [id]
  );
  const salvarRef = useRef(salvar);
  salvarRef.current = salvar;

  function mudar(perguntaId: number, parcial: Partial<Campos>, imediato = false) {
    setCampos((atual) => {
      const novo = { ...(atual[perguntaId] ?? { resposta: null, descritivo: "", evidencia: "", entrevistados: "" }), ...parcial };
      const proximo = { ...atual, [perguntaId]: novo };
      camposRef.current = proximo;
      return proximo;
    });
    clearTimeout(timers.current[perguntaId]);
    naoGravadas.current.add(perguntaId);
    timers.current[perguntaId] = setTimeout(() => salvar(perguntaId), imediato ? 0 : 900);
  }

  const respostasAtuais = useMemo(
    () => Object.entries(campos).map(([k, v]) => ({ pergunta_id: Number(k), resposta: v.resposta, descritivo: v.descritivo })),
    [campos]
  );
  const a = dados?.assessment;
  const perguntasEscopo = useMemo(() => (dados && a ? dados.perguntas.filter((p) => a.areas.includes(p.area)) : []), [dados, a]);
  const maturidade = useMemo(() => (a ? calcularMaturidade(perguntasEscopo, respostasAtuais, a.areas) : null), [a, perguntasEscopo, respostasAtuais]);
  const porPergunta = useMemo(() => new Map(respostasAtuais.map((r) => [r.pergunta_id, r])), [respostasAtuais]);
  const pendentes = perguntasEscopo.filter((p) => !respostaCompleta(p, porPergunta.get(p.id))).length;
  const salvandoAlgo = Object.values(estado).includes("salvando");
  const comErro = Object.values(estado).filter((e) => e === "erro").length;

  async function mudarStatus(para: string) {
    setAgindo(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/assessments/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ para, motivo: para === "Rascunho" ? motivo : undefined }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMsg({ ok: true, texto: para === "Em revisão" ? "Enviado para revisão." : para === "Concluído" ? "Assessment concluído e travado." : "Devolvido ao analista para ajustes." });
      setDevolvendo(false);
      setMotivo("");
      carregar();
    } catch (e: any) {
      setMsg({ ok: false, texto: e.message || "Não foi possível mudar o status." });
    } finally {
      setAgindo(false);
    }
  }

  function abrirEdicao() {
    if (!a) return;
    setEdicao({ titulo: a.titulo, tipo: a.tipo, projetoId: String(a.projeto_id), escopo: a.escopo, objetivo: a.objetivo ?? "", dataInicio: a.data_inicio ?? "", areas: [...a.areas] });
    fetch("/api/projetos").then((r) => r.json()).then((d) => setProjetos(d.projetos || [])).catch(() => setProjetos([]));
  }

  async function salvarEdicao() {
    if (!edicao) return;
    setAgindo(true);
    try {
      const r = await fetch(`/api/assessments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(edicao) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setEdicao(null);
      carregar();
    } catch (e: any) {
      setMsg({ ok: false, texto: e.message || "Erro ao salvar." });
    } finally {
      setAgindo(false);
    }
  }

  if (erro) {
    return (
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos</span>
          <div className="error-banner"><span className="success-text">{erro}</span></div>
          <p><Link href={`${BASE}/assessments`} style={{ color: "var(--accent)" }}>Voltar aos assessments</Link></p>
        </div>
      </section>
    );
  }
  if (!dados || !a || !maturidade) {
    return (
      <section className="content-block">
        <div className="container"><p className="text-muted">Carregando...</p></div>
      </section>
    );
  }

  const editavel = dados.acoes.editar;
  const termo = busca.trim().toLowerCase();
  const visivel = (p: Pergunta) => {
    if (termo && !`${p.codigo} ${p.texto}`.toLowerCase().includes(termo)) return false;
    const feita = respostaCompleta(p, porPergunta.get(p.id));
    return mostrar === "todas" || (mostrar === "pendentes" ? !feita : feita);
  };
  const riscosPorPergunta = new Map<number, Risco[]>();
  dados.riscos.forEach((r) => riscosPorPergunta.set(r.pergunta_id, [...(riscosPorPergunta.get(r.pergunta_id) ?? []), r]));
  const respondidasPct = maturidade.perguntas ? Math.round((maturidade.respondidas / maturidade.perguntas) * 100) : 0;
  const erroEdicao = edicao ? validarNovoAssessment(edicao) : null;

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">
            <Link href={`${BASE}/assessments`} style={{ color: "inherit" }}>Assessments</Link> · {a.codigo}
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
            <div style={{ maxWidth: "48rem" }}>
              <h1>{a.titulo}</h1>
              <p className="text-muted" style={{ margin: "0.25rem 0 0" }}>
                <strong style={{ color: COR_STATUS[a.status] }}>{a.status}</strong> · {a.tipo} · {a.projeto} · conduzido por {a.analista_nome || a.analista_email}
                {a.data_inicio && <> · início {dataBr(a.data_inicio)}</>}
                {a.status === "Concluído" && <> · concluído em {dataBr(a.concluido_em)}, revisado por {a.revisor_nome}</>}
              </p>
            </div>
            {editavel && !edicao && <button className="status-tag" onClick={abrirEdicao}>Editar dados</button>}
          </div>

          {a.status === "Rascunho" && a.devolvido_motivo && (
            <div className="dash-panel" style={{ marginTop: "1.25rem", borderLeft: "4px solid var(--danger)" }}>
              <div className="dash-panel-body">
                <strong>Devolvido por {a.revisor_nome || "revisor"}:</strong> {a.devolvido_motivo}
              </div>
            </div>
          )}
          {msg && (
            <div className="dash-panel" style={{ marginTop: "1.25rem", borderLeft: `4px solid ${msg.ok ? "var(--success)" : "var(--danger)"}` }}>
              <div className="dash-panel-body">{msg.texto}</div>
            </div>
          )}

          {edicao ? (
            <div className="dash-panel" style={{ marginTop: "1.25rem" }}>
              <div className="dash-panel-header">Dados do assessment</div>
              <div className="dash-panel-body">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))", gap: "0 1rem" }}>
                  <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                    <label htmlFor="edTitulo">Título</label>
                    <input id="edTitulo" value={edicao.titulo} onChange={(e) => setEdicao({ ...edicao, titulo: e.target.value })} />
                  </div>
                  <div className="form-field">
                    <label htmlFor="edTipo">Tipo</label>
                    <select id="edTipo" value={edicao.tipo} onChange={(e) => setEdicao({ ...edicao, tipo: e.target.value })}>
                      {TIPOS_ASSESSMENT.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor="edProjeto">Projeto</label>
                    <select id="edProjeto" value={edicao.projetoId} onChange={(e) => setEdicao({ ...edicao, projetoId: e.target.value })}>
                      {projetos.length === 0 && <option value={edicao.projetoId}>{a.projeto}</option>}
                      {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor="edData">Data de início</label>
                    <input id="edData" type="date" value={edicao.dataInicio} onChange={(e) => setEdicao({ ...edicao, dataInicio: e.target.value })} />
                  </div>
                </div>
                <div className="form-field">
                  <label htmlFor="edEscopo">Escopo</label>
                  <textarea id="edEscopo" rows={2} value={edicao.escopo} onChange={(e) => setEdicao({ ...edicao, escopo: e.target.value })} />
                </div>
                <div className="form-field">
                  <label htmlFor="edObjetivo">Objetivo (opcional)</label>
                  <textarea id="edObjetivo" rows={2} value={edicao.objetivo} onChange={(e) => setEdicao({ ...edicao, objetivo: e.target.value })} />
                </div>
                <fieldset className="form-field" style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend style={{ fontWeight: 600 }}>Áreas aplicáveis</legend>
                  <p className="field-helper" style={{ marginTop: 0 }}>Tirar uma área não apaga as respostas dela: voltando a área, elas reaparecem.</p>
                  <div className={s.areasGrade}>
                    {AREAS_ASSESSMENT.map((x) => (
                      <label key={x}>
                        <input
                          type="checkbox"
                          checked={edicao.areas.includes(x)}
                          onChange={() => setEdicao({ ...edicao, areas: edicao.areas.includes(x) ? edicao.areas.filter((y) => y !== x) : [...edicao.areas, x] })}
                        />
                        {x}
                      </label>
                    ))}
                  </div>
                </fieldset>
                {erroEdicao && <p style={{ color: "var(--danger)", margin: "0 0 0.5rem" }}>{erroEdicao}</p>}
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button className="btn-primary" disabled={!!erroEdicao || agindo} onClick={salvarEdicao}>Salvar dados</button>
                  <button className="status-tag" onClick={() => setEdicao(null)}>Cancelar</button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(18rem, 1fr))", gap: "1rem", marginTop: "1.25rem" }}>
              <div>
                <h3 style={{ margin: "0 0 0.25rem" }}>Escopo</h3>
                <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{a.escopo}</p>
              </div>
              {a.objetivo && (
                <div>
                  <h3 style={{ margin: "0 0 0.25rem" }}>Objetivo</h3>
                  <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{a.objetivo}</p>
                </div>
              )}
            </div>
          )}

          <div className="dash-panel" style={{ marginTop: "1.5rem" }}>
            <div className="dash-panel-header">Progresso e maturidade</div>
            <div className="dash-panel-body">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "2rem", marginBottom: "1rem" }}>
                <div>
                  <div style={{ fontSize: "2rem", fontWeight: 700, lineHeight: 1.1 }}>{respondidasPct}%</div>
                  <div className="text-muted" style={{ fontSize: "0.85rem" }}>{maturidade.respondidas} de {maturidade.perguntas} perguntas respondidas</div>
                </div>
                <div>
                  <div style={{ fontSize: "2rem", fontWeight: 700, lineHeight: 1.1, color: "var(--accent)" }}>
                    {maturidade.geral !== null ? `${maturidade.geral.toLocaleString("pt-BR")}%` : "—"}
                  </div>
                  <div className="text-muted" style={{ fontSize: "0.85rem" }}>
                    maturidade geral{maturidade.geral !== null ? ` · ${faixaMaturidade(maturidade.geral)}` : ""}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "2rem", fontWeight: 700, lineHeight: 1.1 }}>{dados.riscos.length}</div>
                  <div className="text-muted" style={{ fontSize: "0.85rem" }}>riscos registrados a partir do assessment</div>
                </div>
              </div>
              <div className={s.legenda} style={{ marginBottom: "0.5rem" }}>
                <span><i className={s.corSim} />Sim</span>
                <span><i className={s.corParcial} />Parcial</span>
                <span><i className={s.corNao} />Não</span>
                <span><i className={s.corNa} />N/A</span>
                <span><i className={s.corDescritiva} />Descritiva respondida</span>
              </div>
              <div className={s.resumoAreas}>
                {maturidade.areas.map((m) => {
                  const w = (n: number) => (m.perguntas ? `${(n / m.perguntas) * 100}%` : "0");
                  return (
                    <button
                      key={m.area}
                      type="button"
                      className={s.linhaArea}
                      onClick={() => document.getElementById(idArea(m.area))?.scrollIntoView({ behavior: "smooth" })}
                      title={`Ir para ${m.area}`}
                    >
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.area}</span>
                      <span className={s.barra}>
                        <span className={s.corSim} style={{ width: w(m.sim) }} />
                        <span className={s.corParcial} style={{ width: w(m.parcial) }} />
                        <span className={s.corNao} style={{ width: w(m.nao) }} />
                        <span className={s.corNa} style={{ width: w(m.na) }} />
                        <span className={s.corDescritiva} style={{ width: w(m.descritivasRespondidas) }} />
                      </span>
                      <span className={s.num}>{m.respondidas}/{m.perguntas}</span>
                      <span className={s.indice}>
                        {m.indice !== null ? `${m.indice.toLocaleString("pt-BR")}%` : "—"}{" "}
                        <span className="text-muted" style={{ fontWeight: 400, fontSize: "0.75rem" }}>{faixaMaturidade(m.indice) ?? ""}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-muted" style={{ fontSize: "0.8rem", margin: "0.75rem 0 0" }}>
                Maturidade: Sim = 1, Parcial = 0,5, Não = 0; N/A não entra na conta. Faixas: Inicial (&lt;40%), Em desenvolvimento (40–69%), Definido (70–89%), Gerenciado (≥90%).
              </p>
            </div>
          </div>

          <div className="dash-panel" style={{ marginTop: "1.5rem" }}>
            <div className="dash-panel-header">Revisão</div>
            <div className="dash-panel-body">
              {a.status === "Rascunho" && (
                <>
                  <p style={{ marginTop: 0 }}>
                    {pendentes > 0
                      ? `Faltam ${pendentes} pergunta(s). Responda todas (ou marque N/A) para enviar à revisão.`
                      : "Todas as perguntas estão respondidas. Envie para a revisão de um perfil com permissão de auditar."}
                  </p>
                  {dados.acoes.enviarRevisao && (
                    <button className="btn-primary" disabled={pendentes > 0 || agindo || salvandoAlgo || comErro > 0} onClick={() => mudarStatus("Em revisão")}>
                      Enviar para revisão
                    </button>
                  )}
                </>
              )}
              {a.status === "Em revisão" && !dados.acoes.revisar && (
                <p style={{ margin: 0 }}>
                  Enviado em {dataBr(a.enviado_revisao_em)}. Aguardando a revisão de um perfil com permissão de auditar, diferente de quem conduziu.
                </p>
              )}
              {a.status === "Em revisão" && dados.acoes.revisar && (
                <>
                  <p style={{ marginTop: 0 }}>Confira as respostas e evidências abaixo. Ao concluir, o assessment fica travado e o relatório guarda uma foto deste momento.</p>
                  {devolvendo ? (
                    <div className="form-field">
                      <label htmlFor="motivo">Motivo da devolução</label>
                      <textarea id="motivo" rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="O que o analista precisa ajustar" />
                      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                        <button className="btn-primary" disabled={!motivo.trim() || agindo} onClick={() => mudarStatus("Rascunho")}>Devolver ao analista</button>
                        <button className="status-tag" onClick={() => setDevolvendo(false)}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                      <button className="btn-primary" disabled={agindo} onClick={() => mudarStatus("Concluído")}>Aprovar e concluir</button>
                      <button className="status-tag" onClick={() => setDevolvendo(true)}>Devolver para ajustes</button>
                    </div>
                  )}
                </>
              )}
              {a.status === "Concluído" && (
                <p style={{ margin: 0 }}>
                  Concluído em {dataBr(a.concluido_em)} e revisado por {a.revisor_nome}. As respostas não podem mais ser alteradas.
                </p>
              )}
            </div>
          </div>

          <div className={s.barraFiltros} style={{ marginTop: "1.5rem" }}>
            <input type="search" placeholder="Buscar por código ou texto" aria-label="Buscar pergunta" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ flex: "1 1 14rem", maxWidth: "22rem" }} />
            <select aria-label="Filtrar perguntas" value={mostrar} onChange={(e) => setMostrar(e.target.value as typeof mostrar)}>
              <option value="todas">Todas as perguntas</option>
              <option value="pendentes">Só pendentes ({pendentes})</option>
              <option value="respondidas">Só respondidas</option>
            </select>
            {editavel && (
              <span className={s.salvando} aria-live="polite">
                {salvandoAlgo ? "Salvando..." : comErro ? `${comErro} resposta(s) não gravada(s)` : "Respostas gravadas automaticamente"}
              </span>
            )}
          </div>

          {AREAS_ASSESSMENT.filter((ar) => a.areas.includes(ar)).map((area) => {
            const ps = perguntasEscopo.filter((p) => p.area === area && visivel(p));
            const m = maturidade.areas.find((x) => x.area === area);
            if (!ps.length) return null;
            return (
              <section key={area} id={idArea(area)} className={s.area}>
                <div className={s.areaCabecalho}>
                  <h2>{area}</h2>
                  <span className="text-muted" style={{ fontSize: "0.85rem" }}>
                    {m?.respondidas}/{m?.perguntas} respondidas{m?.indice !== null && m?.indice !== undefined ? ` · maturidade ${m.indice.toLocaleString("pt-BR")}%` : ""}
                  </span>
                </div>
                {ps.map((p) => {
                  const c = campos[p.id] ?? { resposta: null, descritivo: "", evidencia: "", entrevistados: "" };
                  const feita = respostaCompleta(p, porPergunta.get(p.id));
                  const riscos = riscosPorPergunta.get(p.id) ?? [];
                  const rotuloTexto = p.tipo === "objetiva" ? "Descritivo / observações" : "Resposta";
                  return (
                    <article key={p.id} className={`${s.pergunta} ${feita ? s.respondida : ""}`}>
                      <div className={s.perguntaTopo}>
                        <span className={s.codigo}>{p.codigo}</span>
                        <span className={s.textoPergunta}>{p.texto}</span>
                        <span className={s.tipo}>{p.tipo === "objetiva" ? "Objetiva" : "Descritiva"}{estado[p.id] === "salvando" ? " · salvando..." : estado[p.id] === "salvo" ? " · gravada" : ""}</span>
                      </div>
                      {p.tipo === "objetiva" && (
                        <div className={s.opcoes} role="group" aria-label={`Resposta da pergunta ${p.codigo}`}>
                          {RESPOSTAS_OBJETIVAS.map((o) => (
                            <button
                              key={o}
                              type="button"
                              className={s.opcao}
                              data-v={o}
                              aria-pressed={c.resposta === o}
                              disabled={!editavel}
                              onClick={() => mudar(p.id, { resposta: c.resposta === o ? null : o }, true)}
                            >
                              {o}
                            </button>
                          ))}
                        </div>
                      )}
                      {editavel ? (
                        <div className={s.campos}>
                          <div className="form-field">
                            <label htmlFor={`d-${p.id}`}>{rotuloTexto}</label>
                            <textarea id={`d-${p.id}`} rows={p.tipo === "objetiva" ? 2 : 3} value={c.descritivo} onChange={(e) => mudar(p.id, { descritivo: e.target.value })} onBlur={() => naoGravadas.current.has(p.id) && salvar(p.id)} />
                          </div>
                          <div>
                            <div className="form-field">
                              <label htmlFor={`e-${p.id}`}>Evidência apresentada</label>
                              <input id={`e-${p.id}`} value={c.evidencia} onChange={(e) => mudar(p.id, { evidencia: e.target.value })} />
                            </div>
                            <div className="form-field">
                              <label htmlFor={`w-${p.id}`}>Entrevistado(s)</label>
                              <input id={`w-${p.id}`} value={c.entrevistados} onChange={(e) => mudar(p.id, { entrevistados: e.target.value })} />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ marginTop: "0.5rem" }}>
                          {c.descritivo && <p className={s.leitura}><strong>{rotuloTexto}:</strong> {c.descritivo}</p>}
                          {c.evidencia && <p className={s.leitura}><strong>Evidência:</strong> {c.evidencia}</p>}
                          {c.entrevistados && <p className={s.leitura}><strong>Entrevistado(s):</strong> {c.entrevistados}</p>}
                          {!c.resposta && !c.descritivo && <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>Sem resposta.</p>}
                        </div>
                      )}
                      {riscos.length > 0 && (
                        <div className={s.riscosPergunta}>
                          Riscos registrados:{" "}
                          {riscos.map((r, i) => (
                            <span key={r.risco_id}>
                              {i > 0 && ", "}
                              <Link href={`${BASE}/riscos/${r.risco_id}`} style={{ color: "var(--accent)" }}>#{r.risco_id}</Link>
                              {r.status ? ` (${r.status})` : ""}
                            </span>
                          ))}
                        </div>
                      )}
                      {erroPergunta[p.id] && <div className={s.erroPergunta}>{erroPergunta[p.id]}</div>}
                    </article>
                  );
                })}
              </section>
            );
          })}
          {perguntasEscopo.filter(visivel).length === 0 && (
            <p className="text-muted" style={{ marginTop: "1.5rem" }}>Nenhuma pergunta corresponde ao filtro.</p>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
