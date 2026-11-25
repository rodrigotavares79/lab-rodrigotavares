"use client";

import { useEffect, useState } from "react";
import SeletorDono, { donoPreenchido, type ValorDono } from "@/components/riscos/SeletorDono";

// B14 · Painel "Responsabilidade" na tela do risco: dono do risco (usuário
// do módulo) e ativo ou processo afetado (inventário), com a área
// responsável. Quem edita riscos define ou troca; o ativo só pode ser trocado
// enquanto o risco não tem estimativa financeira.

type Ativo = { id: number; nome: string; tipo: string | null; area_responsavel: string | null };

type Props = {
  riscoId: number;
  projetoId: number;
  donoEmail: string | null;
  donoNome: string | null;
  donoContatoId: number | null;
  pontoFocalEmail: string | null;
  pontoFocalNome: string | null;
  levantadoPor: string;
  ativoId: number | null;
  ativoNome: string | null;
  ativoTipo: string | null;
  ativoArea: string | null;
  podeTrocarAtivo: boolean;
  podeEditar: boolean;
  bloqueado?: boolean;
  onAtualizado: () => void;
};

const rotulo: React.CSSProperties = {
  fontSize: "0.72rem",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--text-muted)",
  margin: 0,
};

export default function ResponsabilidadeRisco(p: Props) {
  const [editando, setEditando] = useState(false);
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const valorInicial = (): ValorDono => ({
    donoEmail: p.donoContatoId ? "" : p.donoEmail || "",
    donoContatoId: p.donoContatoId,
    pontoFocalEmail: p.pontoFocalEmail || "",
  });
  const [dono, setDono] = useState<ValorDono>(valorInicial);
  const [ativoId, setAtivoId] = useState(p.ativoId ? String(p.ativoId) : "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!editando) return;
    fetch(`/api/sistemas-criticos?projetoId=${p.projetoId}`)
      .then((r) => r.json())
      .then((d) => setAtivos(d.sistemas || []))
      .catch(() => setAtivos([]));
  }, [editando, p.projetoId]);

  function abrir() {
    setDono(valorInicial());
    setAtivoId(p.ativoId ? String(p.ativoId) : "");
    setErro(null);
    setEditando(true);
  }

  async function salvar() {
    if (!donoPreenchido(dono)) {
      setErro(dono.donoContatoId !== null ? "Escolha o ponto focal (Analista GRC)." : "Escolha o dono do risco.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const corpo: Record<string, unknown> = {
        donoEmail: dono.donoEmail || null,
        donoContatoId: dono.donoContatoId,
        pontoFocalEmail: dono.pontoFocalEmail || null,
      };
      if (p.podeTrocarAtivo) corpo.ativoId = ativoId ? Number(ativoId) : null;
      const r = await fetch(`/api/riscos/${p.riscoId}/responsabilidade`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Não foi possível salvar.");
      setEditando(false);
      p.onAtualizado();
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  // O ativo atual pode estar inativo no inventário: mantém na lista.
  const opcoesAtivo =
    p.ativoId && !ativos.some((a) => a.id === p.ativoId)
      ? [{ id: p.ativoId, nome: `${p.ativoNome} (inativo)`, tipo: p.ativoTipo, area_responsavel: p.ativoArea }, ...ativos]
      : ativos;

  return (
    <div className="dash-panel" id="responsabilidade">
      <div className="dash-panel-header" style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
        <span>Responsabilidade</span>
        {p.podeEditar && !p.bloqueado && !editando && (
          <button
            type="button"
            onClick={abrir}
            style={{ background: "none", border: 0, padding: 0, color: "var(--accent)", cursor: "pointer", font: "inherit" }}
          >
            {p.donoEmail ? "Editar" : "Definir dono"}
          </button>
        )}
      </div>
      <div className="dash-panel-body">
        {!editando && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))", gap: "0.9rem" }}>
            <div>
              <p style={rotulo}>Dono do risco</p>
              {p.donoEmail ? (
                <p style={{ margin: "0.2rem 0 0" }}>
                  {p.donoNome || p.donoEmail}
                  <span className="text-muted" style={{ display: "block", fontSize: "0.78rem" }}>
                    {p.donoEmail}
                    {p.donoContatoId ? " · contato de negócio, sem acesso" : ""}
                  </span>
                </p>
              ) : (
                <p style={{ margin: "0.2rem 0 0", color: "var(--danger)", fontWeight: 600 }}>Sem dono definido</p>
              )}
            </div>
            {p.donoContatoId && (
              <div>
                <p style={rotulo}>Ponto focal (Analista GRC)</p>
                <p style={{ margin: "0.2rem 0 0" }}>
                  {p.pontoFocalNome || p.pontoFocalEmail}
                  <span className="text-muted" style={{ display: "block", fontSize: "0.78rem" }}>{p.pontoFocalEmail}</span>
                </p>
              </div>
            )}
            <div>
              <p style={rotulo}>Levantado por</p>
              <p style={{ margin: "0.2rem 0 0" }}>{p.levantadoPor || "—"}</p>
            </div>
            <div>
              <p style={rotulo}>Ativo ou processo</p>
              <p style={{ margin: "0.2rem 0 0" }}>
                {p.ativoNome || <span className="text-muted">não vinculado</span>}
                {p.ativoTipo && <span className="text-muted" style={{ display: "block", fontSize: "0.78rem" }}>{p.ativoTipo}</span>}
              </p>
            </div>
            <div>
              <p style={rotulo}>Área responsável</p>
              <p style={{ margin: "0.2rem 0 0" }}>{p.ativoArea || <span className="text-muted">—</span>}</p>
            </div>
          </div>
        )}

        {editando && (
          <div>
            <SeletorDono valor={dono} onChange={setDono} idPrefixo="donoResp" />
            <div className="form-field">
              <label htmlFor="ativoResp">Ativo ou processo afetado</label>
              <select
                id="ativoResp"
                value={ativoId}
                onChange={(e) => setAtivoId(e.target.value)}
                disabled={!p.podeTrocarAtivo}
              >
                <option value="">Não vinculado</option>
                {opcoesAtivo.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                    {a.tipo ? ` · ${a.tipo}` : ""}
                    {a.area_responsavel ? ` · ${a.area_responsavel}` : ""}
                  </option>
                ))}
              </select>
              <p className="field-helper">
                {p.podeTrocarAtivo ? (
                  <>
                    Não está na lista?{" "}
                    <a href="/seguranca/gestao-de-riscos/ativos-criticos" target="_blank" rel="noreferrer">
                      Cadastre no inventário
                    </a>
                    .
                  </>
                ) : (
                  "Este risco tem estimativa financeira calculada com o ativo atual, por isso o ativo não pode ser trocado."
                )}
              </p>
            </div>
            {erro && (
              <p className="field-helper" style={{ color: "var(--danger)" }}>
                {erro}
              </p>
            )}
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem" }}>
              <button type="button" className="btn-primary" onClick={salvar} disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar"}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setEditando(false)} disabled={salvando}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
