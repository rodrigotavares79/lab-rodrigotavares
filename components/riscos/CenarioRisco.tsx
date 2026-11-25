"use client";

import { useState } from "react";
import { montarTituloRisco, validarCenario, TAMANHO_MAXIMO_CAMPO } from "@/lib/cenarioRisco";

// B13 · Painel "Cenário de risco" na tela do risco: causa → evento →
// consequência, ponto de gatilho e detalhamento do impacto. Quem edita riscos
// pode corrigir o cenário; o título é remontado a partir dos três campos.

type Props = {
  riscoId: number;
  causa: string | null;
  evento: string | null;
  consequencia: string | null;
  gatilho: string | null;
  detalhamento: string | null;
  podeEditar: boolean;
  bloqueado?: boolean;
  onAtualizado: () => void;
  // B27: cenário do catálogo ligado ao risco.
  cenarioId?: number | null;
  cenarioCatalogo?: string | null;
};

const estiloRotulo: React.CSSProperties = {
  fontSize: "0.72rem",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--text-muted)",
  margin: 0,
};

function Bloco({ rotulo, texto, dica }: { rotulo: string; texto: string | null; dica?: string }) {
  return (
    <div style={{ marginBottom: "0.9rem" }}>
      <p style={estiloRotulo}>
        {rotulo}
        {dica && <span style={{ textTransform: "none", letterSpacing: 0 }}> · {dica}</span>}
      </p>
      <p style={{ margin: "0.2rem 0 0" }}>{texto || <span className="text-muted">—</span>}</p>
    </div>
  );
}

function VinculoCatalogo({
  riscoId,
  cenarioId,
  rotulo,
  podeEditar,
  onAtualizado,
}: {
  riscoId: number;
  cenarioId: number | null;
  rotulo: string | null;
  podeEditar: boolean;
  onAtualizado: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [opcoes, setOpcoes] = useState<{ id: number; codigo: string; nome: string }[]>([]);
  const [escolha, setEscolha] = useState(cenarioId ? String(cenarioId) : "");
  const [erro, setErro] = useState<string | null>(null);

  async function abrir() {
    setAberto(true);
    setErro(null);
    const d = await fetch("/api/cenarios").then((r) => r.json()).catch(() => ({}));
    setOpcoes(d.cenarios || []);
  }
  async function salvar() {
    const r = await fetch(`/api/riscos/${riscoId}/cenario-catalogo`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cenarioId: escolha ? Number(escolha) : null }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return setErro(d.error || "Não foi possível salvar.");
    setAberto(false);
    onAtualizado();
  }
  const botao: React.CSSProperties = { background: "none", border: 0, padding: 0, color: "var(--accent)", cursor: "pointer", font: "inherit" };

  return (
    <div style={{ marginBottom: "0.9rem" }}>
      <p style={estiloRotulo}>
        Catálogo de cenários<span style={{ textTransform: "none", letterSpacing: 0 }}> · o mesmo cenário em outros projetos</span>
      </p>
      {!aberto ? (
        <p style={{ margin: "0.2rem 0 0" }}>
          {cenarioId ? (
            <a href={`/seguranca/gestao-de-riscos/cenarios/${cenarioId}`}>{rotulo}</a>
          ) : (
            <span className="text-muted">não ligado</span>
          )}
          {podeEditar && (
            <>
              {" · "}
              <button type="button" style={botao} onClick={abrir}>
                {cenarioId ? "trocar" : "ligar"}
              </button>
            </>
          )}
        </p>
      ) : (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", marginTop: "0.3rem" }}>
          <select value={escolha} onChange={(e) => setEscolha(e.target.value)} aria-label="Cenário do catálogo">
            <option value="">Não ligado</option>
            {opcoes.map((o) => (
              <option key={o.id} value={o.id}>
                {o.codigo} · {o.nome}
              </option>
            ))}
          </select>
          <button type="button" className="btn-primary" onClick={salvar}>
            Salvar
          </button>
          <button type="button" className="btn-secondary" onClick={() => setAberto(false)}>
            Cancelar
          </button>
          {erro && <span style={{ color: "var(--danger)" }}>{erro}</span>}
        </div>
      )}
    </div>
  );
}

export default function CenarioRisco(props: Props) {
  const [editando, setEditando] = useState(false);
  const [causa, setCausa] = useState(props.causa || "");
  const [evento, setEvento] = useState(props.evento || "");
  const [consequencia, setConsequencia] = useState(props.consequencia || "");
  const [gatilho, setGatilho] = useState(props.gatilho || "");
  const [detalhamento, setDetalhamento] = useState(props.detalhamento || "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const completo = !!(props.causa && props.evento && props.consequencia);
  const previa = montarTituloRisco({ causa, evento, consequencia });

  function abrir() {
    setCausa(props.causa || "");
    setEvento(props.evento || "");
    setConsequencia(props.consequencia || "");
    setGatilho(props.gatilho || "");
    setDetalhamento(props.detalhamento || "");
    setErro(null);
    setEditando(true);
  }

  async function salvar() {
    const invalido = validarCenario({ causa, evento, consequencia });
    if (invalido) {
      setErro(invalido);
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const r = await fetch(`/api/riscos/${props.riscoId}/cenario`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ causa, evento, consequencia, gatilho, detalhamento }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Não foi possível salvar o cenário.");
      setEditando(false);
      props.onAtualizado();
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="dash-panel" id="cenario">
      <div className="dash-panel-header" style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
        <span>Cenário de risco</span>
        {props.podeEditar && !props.bloqueado && !editando && (
          <button
            type="button"
            onClick={abrir}
            style={{ background: "none", border: 0, padding: 0, color: "var(--accent)", cursor: "pointer", font: "inherit" }}
          >
            Editar cenário
          </button>
        )}
      </div>
      <div className="dash-panel-body">
        {!editando && (
          <>
            {!completo && (
              <p className="field-helper" style={{ marginTop: 0, color: "var(--danger)" }}>
                Cenário incompleto: preencha causa, evento e consequência para gerar o título do risco.
              </p>
            )}
            <Bloco rotulo="Causa" dica="por que pode acontecer" texto={props.causa} />
            <Bloco rotulo="Evento" dica="o que pode acontecer" texto={props.evento} />
            <Bloco rotulo="Consequência" dica="o que acontece se ocorrer" texto={props.consequencia} />
            <Bloco rotulo="Ponto de gatilho" dica="sinal observável de que o risco está se materializando" texto={props.gatilho} />
            <Bloco rotulo="Detalhamento do impacto" texto={props.detalhamento} />
            <VinculoCatalogo
              riscoId={props.riscoId}
              cenarioId={props.cenarioId ?? null}
              rotulo={props.cenarioCatalogo ?? null}
              podeEditar={props.podeEditar && !props.bloqueado}
              onAtualizado={props.onAtualizado}
            />
          </>
        )}

        {editando && (
          <div>
            {[
              ["causaCenario", "Causa", "Por que pode acontecer (ameaça, vulnerabilidade, falha de controle)", causa, setCausa],
              ["eventoCenario", "Evento", "O que pode acontecer", evento, setEvento],
              ["consequenciaCenario", "Consequência", "O que acontece se o evento ocorrer", consequencia, setConsequencia],
            ].map(([id, rotulo, dica, valor, setter]: any) => (
              <div className="form-field" key={id}>
                <label htmlFor={id}>{rotulo} *</label>
                <input
                  id={id}
                  type="text"
                  value={valor}
                  maxLength={TAMANHO_MAXIMO_CAMPO}
                  placeholder={dica}
                  onChange={(e) => setter(e.target.value)}
                />
              </div>
            ))}
            <div className="form-field">
              <label htmlFor="gatilhoCenario">Ponto de gatilho</label>
              <input
                id="gatilhoCenario"
                type="text"
                value={gatilho}
                maxLength={500}
                placeholder="Sinal observável e mensurável (ex.: CVSS ≥ 9 sem correção em 15 dias)"
                onChange={(e) => setGatilho(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="detalhamentoCenario">Detalhamento do impacto</label>
              <textarea
                id="detalhamentoCenario"
                rows={3}
                value={detalhamento}
                maxLength={4000}
                onChange={(e) => setDetalhamento(e.target.value)}
              />
            </div>
            <p className="field-helper">
              <strong>Título:</strong> {previa || "preencha causa, evento e consequência"}
            </p>
            {erro && (
              <p className="field-helper" style={{ color: "var(--danger)" }}>
                {erro}
              </p>
            )}
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem" }}>
              <button type="button" className="btn-primary" onClick={salvar} disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar cenário"}
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
