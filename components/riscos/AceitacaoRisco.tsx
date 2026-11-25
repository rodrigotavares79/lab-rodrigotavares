"use client";

import { useEffect, useState } from "react";
import { formatTamanho } from "@/components/riscos/EvidenciasPlano";

// B16 · Painel "Aceitação do risco" na tela do risco: histórico das
// aceitações, decisão (para quem tem alçada e não pediu) e o pedido com a
// Carta de Risco. As regras valem de fato nas rotas de API.

type Aceitacao = {
  id: number;
  situacao: "Pendente" | "Aprovada" | "Recusada" | "Revogada";
  justificativa: string;
  validade_meses: number;
  nivel_no_pedido: string;
  carta_nome: string;
  carta_tamanho: number;
  carta_sha256: string;
  solicitado_por_nome: string | null;
  solicitado_em: string;
  decidido_por_nome: string | null;
  decidido_por_perfil: string | null;
  decidido_em: string | null;
  motivo_decisao: string | null;
  valido_ate: string | null;
  revogado_em: string | null;
  vencida: boolean;
  cartaUrl: string;
  podeDecidir: boolean;
};

const COR: Record<Aceitacao["situacao"], string> = {
  Pendente: "#b7791f",
  Aprovada: "var(--success)",
  Recusada: "var(--danger)",
  Revogada: "var(--text-muted)",
};

function data(d: string | null) {
  if (!d) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [a, m, dia] = d.split("-");
    return `${dia}/${m}/${a}`;
  }
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AceitacaoRisco({
  riscoId,
  statusRisco,
  opcaoTratamento,
  podeSolicitar,
  onAtualizado,
}: {
  riscoId: number;
  statusRisco: string;
  opcaoTratamento: string | null;
  podeSolicitar: boolean;
  onAtualizado: () => void;
}) {
  const [aceitacoes, setAceitacoes] = useState<Aceitacao[] | null>(null);
  const [alcada, setAlcada] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mostrarPedido, setMostrarPedido] = useState(false);
  const [motivo, setMotivo] = useState("");

  function carregar() {
    fetch(`/api/riscos/${riscoId}/aceitacoes`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setAceitacoes(d.aceitacoes || []);
        setAlcada(d.alcada || "");
      })
      .catch((e) => setErro(e.message));
  }

  useEffect(carregar, [riscoId, statusRisco]);

  const ativa = aceitacoes?.find((a) => a.situacao === "Pendente" || a.situacao === "Aprovada");
  const podePedir = podeSolicitar && statusRisco !== "Mitigado" && !ativa;

  async function solicitar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/riscos/${riscoId}/aceitacoes`, { method: "POST", body: new FormData(e.currentTarget) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao solicitar a aceitação.");
      setMostrarPedido(false);
      carregar();
      onAtualizado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao solicitar a aceitação.");
    } finally {
      setEnviando(false);
    }
  }

  async function decidir(a: Aceitacao, decisao: "Aprovar" | "Recusar") {
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/riscos/${riscoId}/aceitacoes/${a.id}/decisao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisao, motivo }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Falha ao registrar a decisão.");
      setMotivo("");
      carregar();
      onAtualizado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao registrar a decisão.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="dash-panel" id="aceitacao">
      <div className="dash-panel-header">Aceitação do risco</div>
      <div className="dash-panel-body">
        <p className="field-helper" style={{ marginTop: 0 }}>
          Opção de tratamento: <strong>{opcaoTratamento || "não definida"}</strong>. Aceitar o risco exige Carta de Risco
          assinada e aprovação de quem tem alçada para o nível atual ({alcada || "—"}). Quem pede não aprova.
        </p>

        {aceitacoes === null && !erro && <p className="text-muted">Carregando...</p>}
        {aceitacoes && aceitacoes.length === 0 && (
          <p className="text-muted" style={{ fontSize: "0.85rem" }}>Nenhuma aceitação solicitada para este risco.</p>
        )}

        {aceitacoes?.map((a) => (
          <div key={a.id} style={{ borderLeft: `3px solid ${COR[a.situacao]}`, padding: "0.5rem 0.75rem", marginBottom: "0.75rem", background: "var(--surface)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
              <strong style={{ color: COR[a.situacao] }}>
                {a.situacao}
                {a.situacao === "Aprovada" && a.vencida ? " · vencida" : ""}
              </strong>
              <span className="text-muted" style={{ fontSize: "0.78rem" }}>
                pedida por {a.solicitado_por_nome || "—"} em {data(a.solicitado_em)} · risco {a.nivel_no_pedido}
              </span>
            </div>
            <p style={{ margin: "0.35rem 0", fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>{a.justificativa}</p>
            <div style={{ fontSize: "0.78rem" }}>
              <a href={a.cartaUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", fontWeight: 600 }}>
                {a.carta_nome}
              </a>{" "}
              <span className="text-muted">
                · {formatTamanho(a.carta_tamanho)} · SHA-256 {a.carta_sha256.slice(0, 16)}…
              </span>
            </div>
            <div className="text-muted" style={{ fontSize: "0.78rem", marginTop: "0.25rem" }}>
              {a.situacao === "Pendente" && `Validade pedida: ${a.validade_meses} meses.`}
              {a.situacao === "Aprovada" && `Aprovada por ${a.decidido_por_nome} em ${data(a.decidido_em)} · válida até ${data(a.valido_ate)}.`}
              {a.situacao === "Recusada" && `Recusada por ${a.decidido_por_nome} em ${data(a.decidido_em)}.`}
              {a.situacao === "Revogada" && `Revogada em ${data(a.revogado_em)}.`}
              {a.motivo_decisao && ` Motivo: ${a.motivo_decisao}`}
            </div>

            {a.podeDecidir && (
              <div style={{ marginTop: "0.6rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={2}
                  maxLength={2000}
                  placeholder="Comentário (obrigatório para recusar)"
                  aria-label="Comentário da decisão"
                />
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button type="button" className="btn-primary" disabled={enviando} onClick={() => decidir(a, "Aprovar")}>
                    Aprovar aceitação
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={enviando}
                    onClick={() => decidir(a, "Recusar")}
                  >
                    Recusar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {podePedir && !mostrarPedido && (
          <button type="button" className="btn-secondary" onClick={() => setMostrarPedido(true)}>
            Solicitar aceitação do risco
          </button>
        )}

        {podePedir && mostrarPedido && (
          <form onSubmit={solicitar} className="form-grid" style={{ marginTop: "0.5rem" }}>
            <div className="form-field form-field-wide">
              <label htmlFor="cartaRisco">Carta de Risco assinada (PDF ou DOCX)</label>
              <input id="cartaRisco" name="carta" type="file" accept=".pdf,.docx" required />
              <p className="field-helper">
                Use o{" "}
                <a href="/modelo-carta-de-risco.docx" style={{ color: "var(--accent)" }}>
                  modelo de Carta de Risco
                </a>
                .
              </p>
            </div>
            <div className="form-field form-field-wide">
              <label htmlFor="justificativaAceitacao">Justificativa</label>
              <textarea
                id="justificativaAceitacao"
                name="justificativa"
                rows={3}
                minLength={20}
                maxLength={4000}
                required
                placeholder="Por que aceitar em vez de tratar: custo x perda esperada, controles compensatórios, prazo."
              />
            </div>
            <div className="form-field">
              <label htmlFor="validadeAceitacao">Validade</label>
              <select id="validadeAceitacao" name="validadeMeses" defaultValue="12">
                {[3, 6, 12, 18, 24].map((m) => (
                  <option key={m} value={m}>{m} meses</option>
                ))}
              </select>
            </div>
            <div className="form-field-wide form-actions">
              <button type="submit" className="btn-primary" disabled={enviando}>
                {enviando ? "Enviando..." : "Enviar para aprovação"}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setMostrarPedido(false)}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        {erro && (
          <div className="error-banner" style={{ marginTop: "0.75rem" }}>
            <span className="success-icon error-icon">!</span>
            <span className="success-text">{erro}</span>
          </div>
        )}
      </div>
    </div>
  );
}
