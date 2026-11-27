"use client";

import { useCallback, useEffect, useState } from "react";
import { usePerfilRiscos } from "@/components/riscos/PermissoesRiscos";
import { validarSolicitacao } from "@/lib/projetosRegras";

// B29 · Fica embaixo de toda lista de projetos usada em cadastro (riscos,
// ativos, assessments). Quem não acha o projeto pede a inclusão aqui; quem
// administra vai direto à tela de Projetos. Mostra as solicitações do próprio
// usuário, para ele acompanhar a decisão.

type Solicitacao = { id: number; nome: string; situacao: string; motivo_recusa: string | null; projeto_nome: string | null; solicitado_por_email: string };

const BASE = "/seguranca/gestao-de-riscos";

export default function SolicitarProjeto() {
  const perfil = usePerfilRiscos();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [minhas, setMinhas] = useState<Solicitacao[]>([]);

  const carregar = useCallback(() => {
    fetch("/api/projetos/solicitacoes")
      .then((r) => r.json())
      .then((d) => setMinhas((d.solicitacoes || []).filter((s: Solicitacao) => s.solicitado_por_email?.toLowerCase() === (d.email || "").toLowerCase()).slice(0, 5)))
      .catch(() => setMinhas([]));
  }, []);
  useEffect(() => {
    if (perfil.carregado && perfil.permissoes.editarRiscos) carregar();
  }, [perfil.carregado, perfil.permissoes.editarRiscos, carregar]);

  if (!perfil.carregado || !perfil.permissoes.editarRiscos) return null;

  const erro = validarSolicitacao({ nome, justificativa });

  async function enviar() {
    setEnviando(true);
    setMsg(null);
    try {
      const r = await fetch("/api/projetos/solicitacoes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome, justificativa }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMsg({ ok: true, texto: "Solicitação enviada. Um Administrador ou CISO vai analisar; a decisão aparece aqui." });
      setNome("");
      setJustificativa("");
      setAberto(false);
      carregar();
    } catch (e: any) {
      setMsg({ ok: false, texto: e.message || "Não foi possível enviar a solicitação." });
    } finally {
      setEnviando(false);
    }
  }

  const pendentesOuRecentes = minhas.filter((s) => s.situacao === "Pendente" || s.situacao === "Recusada" || s.situacao === "Aprovada");

  return (
    <div style={{ fontSize: "0.85rem", marginTop: "0.35rem" }}>
      {!aberto && (
        <span className="field-helper">
          Não encontrou o projeto?{" "}
          {perfil.permissoes.gerirUsuarios ? (
            <a href={`${BASE}/projetos`} style={{ color: "var(--accent)" }}>Cadastre na tela de Projetos</a>
          ) : (
            <button type="button" onClick={() => { setAberto(true); setMsg(null); }} style={{ background: "none", border: 0, padding: 0, color: "var(--accent)", cursor: "pointer", font: "inherit", textDecoration: "underline" }}>
              Solicitar inclusão
            </button>
          )}
        </span>
      )}
      {aberto && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.75rem", marginTop: "0.25rem", background: "var(--surface)" }}>
          <div className="form-field" style={{ marginBottom: "0.5rem" }}>
            <label htmlFor="solNome">Nome do projeto</label>
            <input id="solNome" value={nome} maxLength={120} onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => e.key === "Enter" && e.preventDefault()} placeholder="Como o projeto deve aparecer na lista" />
          </div>
          <div className="form-field" style={{ marginBottom: "0.5rem" }}>
            <label htmlFor="solJust">Para que é necessário</label>
            <textarea id="solJust" rows={2} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder="Ex.: nova unidade que entra no escopo de riscos em 2027" />
          </div>
          {(nome || justificativa) && erro && <p style={{ color: "var(--danger)", margin: "0 0 0.5rem" }}>{erro}</p>}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" className="btn-primary" disabled={!!erro || enviando} onClick={enviar}>{enviando ? "Enviando..." : "Enviar solicitação"}</button>
            <button type="button" className="status-tag" onClick={() => setAberto(false)}>Cancelar</button>
          </div>
        </div>
      )}
      {msg && <p style={{ margin: "0.35rem 0 0", color: msg.ok ? "var(--success)" : "var(--danger)" }}>{msg.texto}</p>}
      {pendentesOuRecentes.length > 0 && (
        <ul style={{ margin: "0.35rem 0 0", paddingLeft: "1.1rem", color: "var(--text-muted)" }}>
          {pendentesOuRecentes.map((s) => (
            <li key={s.id}>
              {s.nome}:{" "}
              {s.situacao === "Pendente" && "aguardando análise"}
              {s.situacao === "Aprovada" && <span style={{ color: "var(--success)" }}>aprovada{s.projeto_nome && s.projeto_nome !== s.nome ? ` como "${s.projeto_nome}"` : ""}, já está na lista</span>}
              {s.situacao === "Recusada" && <span style={{ color: "var(--danger)" }}>recusada ({s.motivo_recusa})</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
