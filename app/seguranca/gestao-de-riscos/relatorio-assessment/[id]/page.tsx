"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  faixaMaturidade,
  listarAchados,
  resumoExecutivo,
  type Maturidade,
  type Pergunta,
} from "@/lib/assessmentRegras";

// B28 · Relatório do assessment, pronto para imprimir ou salvar em PDF (fica
// fora da moldura do módulo, como o Relatório Executivo). Concluído: lê a
// foto gravada na conclusão. Antes disso: prévia com os dados atuais.

const BASE = "/seguranca/gestao-de-riscos";

type Resposta = { pergunta_id: number; resposta: string | null; descritivo: string | null; evidencia: string | null; entrevistados: string | null };
type Risco = { pergunta_id: number; risco_id: number; titulo: string | null; gatilho: string | null; status: string | null; impacto_qualitativo: string | null; matrix_score: number | null };
type Dados = {
  assessment: {
    id: number;
    codigo: string;
    titulo: string;
    tipo: string;
    projeto: string;
    escopo: string;
    objetivo: string | null;
    areas: string[];
    status: string;
    analista_nome: string | null;
    analista_email: string;
    revisor_nome: string | null;
    data_inicio: string | null;
    concluido_em: string | null;
  };
  previa: boolean;
  perguntas: Pergunta[];
  respostas: Resposta[];
  riscos: Risco[];
  maturidade: Maturidade;
  fotoEm: string | null;
};

const BADGE: Record<string, string> = { Baixo: "badge-baixo", Médio: "badge-medio", Alto: "badge-alto", Crítico: "badge-critico" };
const ORDEM_NIVEL: Record<string, number> = { Crítico: 0, Alto: 1, Médio: 2, Baixo: 3 };
const COR_FAIXA: Record<string, string> = { Inicial: "var(--danger)", "Em desenvolvimento": "var(--warning-text)", Definido: "var(--accent)", Gerenciado: "var(--success)" };

function dataBr(d: string | null) {
  if (!d) return "—";
  const iso = d.slice(0, 10);
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}
const pct = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("pt-BR")}%`);

export default function RelatorioAssessment() {
  const { id } = useParams<{ id: string }>();
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [emitidoEm] = useState(() => new Date());

  useEffect(() => {
    fetch(`/api/assessments/${id}/relatorio`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setDados(d);
        // O título vira o nome sugerido do PDF.
        document.title = `Relatório de assessment - ${d.assessment.codigo} - ${d.assessment.titulo}`;
      })
      .catch((e) => setErro(e.message || "Erro ao carregar o relatório."));
  }, [id]);

  if (erro) {
    return (
      <div className="error-banner" style={{ maxWidth: "34rem", margin: "3rem auto" }}>
        <span className="success-icon error-icon">!</span>
        <span className="success-text">{erro}</span>
      </div>
    );
  }
  if (!dados) return <p className="text-muted" style={{ textAlign: "center", marginTop: "3rem" }}>Carregando relatório...</p>;

  const { assessment: a, maturidade: m } = dados;
  const achados = listarAchados(dados.perguntas, dados.respostas, a.areas);
  const resumo = resumoExecutivo(m, achados, dados.riscos.length);
  const riscosPorPergunta = new Map<number, Risco[]>();
  dados.riscos.forEach((r) => riscosPorPergunta.set(r.pergunta_id, [...(riscosPorPergunta.get(r.pergunta_id) ?? []), r]));
  const perguntaPorId = new Map(dados.perguntas.map((p) => [p.id, p]));
  const porPergunta = new Map(dados.respostas.map((r) => [r.pergunta_id, r]));
  const descritivas = dados.perguntas.filter((p) => a.areas.includes(p.area) && p.tipo === "descritiva" && porPergunta.get(p.id)?.descritivo?.trim());
  const entrevistados = [
    ...new Set(
      dados.respostas
        .flatMap((r) => (r.entrevistados ?? "").split(/[;,\n]/))
        .map((x) => x.trim())
        .filter(Boolean)
    ),
  ].sort((x, y) => x.localeCompare(y, "pt-BR"));
  const riscosOrdenados = [...dados.riscos].sort(
    (x, y) => (ORDEM_NIVEL[x.impacto_qualitativo ?? ""] ?? 9) - (ORDEM_NIVEL[y.impacto_qualitativo ?? ""] ?? 9) || x.risco_id - y.risco_id
  );
  const criticosAltos = dados.riscos.filter((r) => r.impacto_qualitativo === "Crítico" || r.impacto_qualitativo === "Alto").length;
  const nao = achados.filter((x) => x.resposta === "Não").length;
  const faixaGeral = faixaMaturidade(m.geral);

  return (
    <>
      <div className="report-toolbar">
        <button className="btn-primary" onClick={() => window.print()}>🖶 Imprimir / Salvar como PDF</button>
        <a href={`${BASE}/assessments/${a.id}`} className="status-tag" style={{ marginTop: 0 }}>← Voltar ao assessment</a>
      </div>

      <div className="report-page">
        {dados.previa && (
          <div style={{ border: "1px solid var(--warning)", background: "var(--warning-tint, #fbf6e6)", color: "var(--warning-text)", padding: "0.6rem 0.9rem", borderRadius: 8, fontSize: "0.85rem", marginBottom: "1rem" }}>
            <strong>Prévia.</strong> O assessment está em {a.status}: os números abaixo mudam até a conclusão e a aprovação do revisor.
          </div>
        )}

        <div className="report-header">
          <div>
            <span className="report-brand">Rodrigo Tavares — Gestão de Riscos de TI</span>
            <h1>Relatório de Assessment de Segurança</h1>
            <div className="report-subtitle">{a.codigo} · {a.titulo}</div>
            <div className="report-subtitle">{a.tipo} · Projeto: {a.projeto}</div>
          </div>
          <div className="report-meta">
            <strong>Situação</strong>
            {a.status}
            <br />
            <strong style={{ marginTop: "0.4rem" }}>Período</strong>
            {dataBr(a.data_inicio)} a {a.concluido_em ? dataBr(a.concluido_em) : "em andamento"}
            <br />
            <strong style={{ marginTop: "0.4rem" }}>Conduzido por</strong>
            {a.analista_nome || a.analista_email}
            {a.revisor_nome && a.status === "Concluído" && (
              <>
                <br />
                <strong style={{ marginTop: "0.4rem" }}>Revisado e aprovado por</strong>
                {a.revisor_nome}
              </>
            )}
            <br />
            <strong style={{ marginTop: "0.4rem" }}>Emitido em</strong>
            {emitidoEm.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
          </div>
        </div>

        <div className="report-section">
          <h2>Resumo Executivo</h2>
          <div className="report-kpi-row" style={{ flexWrap: "wrap" }}>
            <div className="report-kpi-box">
              <div className="report-kpi-label">Maturidade geral</div>
              <div className="report-kpi-value" style={{ color: faixaGeral ? COR_FAIXA[faixaGeral] : undefined }}>{pct(m.geral)}</div>
              <div className="text-muted" style={{ fontSize: "0.75rem" }}>{faixaGeral ?? "sem índice"}</div>
            </div>
            <div className="report-kpi-box">
              <div className="report-kpi-label">Perguntas respondidas</div>
              <div className="report-kpi-value">{m.respondidas}/{m.perguntas}</div>
            </div>
            <div className={`report-kpi-box ${nao > 0 ? "report-alert" : "report-ok"}`}>
              <div className="report-kpi-label">Controles ausentes</div>
              <div className="report-kpi-value">{nao}</div>
            </div>
            <div className="report-kpi-box">
              <div className="report-kpi-label">Controles parciais</div>
              <div className="report-kpi-value">{achados.length - nao}</div>
            </div>
            <div className={`report-kpi-box ${criticosAltos > 0 ? "report-alert" : ""}`}>
              <div className="report-kpi-label">Riscos registrados</div>
              <div className="report-kpi-value">{dados.riscos.length}</div>
              <div className="text-muted" style={{ fontSize: "0.75rem" }}>{criticosAltos} crítico(s) ou alto(s)</div>
            </div>
          </div>
          <ul style={{ margin: "1rem 0 0", paddingLeft: "1.1rem", display: "grid", gap: "0.35rem", fontSize: "0.9rem" }}>
            {resumo.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </div>

        <div className="report-section">
          <h2>Escopo e Metodologia</h2>
          <p style={{ fontSize: "0.88rem", margin: "0 0 0.5rem", whiteSpace: "pre-wrap" }}><strong>Escopo:</strong> {a.escopo}</p>
          {a.objetivo && <p style={{ fontSize: "0.88rem", margin: "0 0 0.5rem", whiteSpace: "pre-wrap" }}><strong>Objetivo:</strong> {a.objetivo}</p>}
          <p style={{ fontSize: "0.88rem", margin: "0 0 0.5rem" }}>
            <strong>Áreas avaliadas ({a.areas.length}):</strong> {m.areas.map((x) => x.area).join(", ")}.
          </p>
          <p className="text-muted" style={{ fontSize: "0.82rem", margin: "0 0 0.5rem" }}>
            Questionário com perguntas objetivas (Sim, Não, Parcial ou N/A) e descritivas, respondido em entrevistas com
            apresentação de evidências. Índice de maturidade por área: Sim = 1, Parcial = 0,5, Não = 0, sobre as perguntas
            objetivas aplicáveis (N/A fica fora da conta). Faixas: Inicial (abaixo de 40%), Em desenvolvimento (40% a 69%),
            Definido (70% a 89%) e Gerenciado (90% ou mais). O índice geral pondera as áreas pelo número de perguntas aplicáveis.
          </p>
          {entrevistados.length > 0 && (
            <p style={{ fontSize: "0.85rem", margin: 0 }}><strong>Entrevistados:</strong> {entrevistados.join(", ")}.</p>
          )}
        </div>

        <div className="report-section">
          <h2>Maturidade por Área</h2>
          <table className="report-table">
            <thead>
              <tr><th>Área</th><th style={{ width: "34%" }}>Índice</th><th>Faixa</th><th style={{ textAlign: "right" }}>Sim</th><th style={{ textAlign: "right" }}>Parcial</th><th style={{ textAlign: "right" }}>Não</th><th style={{ textAlign: "right" }}>N/A</th></tr>
            </thead>
            <tbody>
              {m.areas.map((x) => {
                const f = faixaMaturidade(x.indice);
                return (
                  <tr key={x.area}>
                    <td>{x.area}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ flex: 1, height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: `${x.indice ?? 0}%`, height: "100%", background: f ? COR_FAIXA[f] : "transparent" }} />
                        </div>
                        <strong style={{ minWidth: "3.2rem", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{pct(x.indice)}</strong>
                      </div>
                    </td>
                    <td style={{ color: f ? COR_FAIXA[f] : undefined, whiteSpace: "nowrap" }}>{f ?? "—"}</td>
                    <td style={{ textAlign: "right" }}>{x.sim}</td>
                    <td style={{ textAlign: "right" }}>{x.parcial}</td>
                    <td style={{ textAlign: "right" }}>{x.nao}</td>
                    <td style={{ textAlign: "right" }}>{x.na}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="report-section">
          <h2>Achados</h2>
          {achados.length === 0 ? (
            <p className="text-muted" style={{ fontSize: "0.85rem", margin: 0 }}>Nenhuma resposta Não ou Parcial nas perguntas objetivas.</p>
          ) : (
            <table className="report-table">
              <thead>
                <tr><th>Pergunta</th><th>Resposta</th><th>Observação e evidência</th><th>Riscos</th></tr>
              </thead>
              <tbody>
                {achados.map((x) => {
                  const rs = riscosPorPergunta.get(x.pergunta.id) ?? [];
                  return (
                    <tr key={x.pergunta.id}>
                      <td style={{ minWidth: "14rem" }}>
                        <span className="text-muted">{x.pergunta.codigo}</span> {x.pergunta.texto}
                        <div className="text-muted" style={{ fontSize: "0.72rem" }}>{x.pergunta.area}</div>
                      </td>
                      <td style={{ fontWeight: 600, color: x.resposta === "Não" ? "var(--danger)" : "var(--warning-text)" }}>{x.resposta}</td>
                      <td style={{ fontSize: "0.8rem" }}>
                        {x.descritivo || <span className="text-muted">—</span>}
                        {x.evidencia && <div className="text-muted">Evidência: {x.evidencia}</div>}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>{rs.length ? rs.map((r) => `#${r.risco_id}`).join(", ") : <span className="text-muted">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="report-section">
          <h2>Riscos Registrados</h2>
          {riscosOrdenados.length === 0 ? (
            <p className="text-muted" style={{ fontSize: "0.85rem", margin: 0 }}>Nenhum risco foi registrado a partir deste assessment.</p>
          ) : (
            <>
              <table className="report-table">
                <thead>
                  <tr><th>Risco</th><th>Nível</th><th>Status</th><th>Origem</th></tr>
                </thead>
                <tbody>
                  {riscosOrdenados.map((r) => (
                    <tr key={`${r.risco_id}-${r.pergunta_id}`}>
                      <td style={{ minWidth: "16rem" }}><strong>#{r.risco_id}</strong> {r.titulo || r.gatilho || ""}</td>
                      <td>{r.impacto_qualitativo ? <span className={`badge ${BADGE[r.impacto_qualitativo] ?? ""}`}>{r.impacto_qualitativo}</span> : "—"}</td>
                      <td>{r.status || "—"}</td>
                      <td className="text-muted">{perguntaPorId.get(r.pergunta_id)?.codigo ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-muted" style={{ fontSize: "0.75rem", margin: "0.5rem 0 0" }}>
                {dados.previa
                  ? "Nível e status atuais de cada risco no cadastro."
                  : `Nível e status de cada risco na data da conclusão (${dataBr(dados.fotoEm)}). O acompanhamento segue no cadastro de riscos.`}
              </p>
            </>
          )}
        </div>

        {descritivas.length > 0 && (
          <div className="report-section">
            <h2>Anexo: Respostas Descritivas</h2>
            {descritivas.map((p) => {
              const r = porPergunta.get(p.id)!;
              return (
                <div key={p.id} style={{ marginBottom: "0.75rem", breakInside: "avoid", fontSize: "0.85rem" }}>
                  <strong><span className="text-muted">{p.codigo}</span> {p.texto}</strong>
                  <div style={{ whiteSpace: "pre-wrap" }}>{r.descritivo}</div>
                  {r.evidencia && <div className="text-muted" style={{ fontSize: "0.78rem" }}>Evidência: {r.evidencia}</div>}
                </div>
              );
            })}
          </div>
        )}

        <div className="report-footer">
          <span>{a.codigo} · {a.titulo}</span>
          <span>{dados.previa ? "Prévia, sujeita a alteração" : `Versão aprovada em ${dataBr(a.concluido_em)}`}</span>
        </div>
      </div>
    </>
  );
}
