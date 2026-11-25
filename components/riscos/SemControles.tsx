"use client";

import { useState } from "react";

// B15 · Situação dos controles existentes na tela do risco: aviso quando não
// foram avaliados, e a declaração "não há controles" (com justificativa),
// que se desfaz sozinha quando um controle é cadastrado.

export default function SemControles({
  riscoId,
  semControles,
  justificativa,
  declaradoPor,
  declaradoEm,
  podeEditar,
  onAtualizado,
}: {
  riscoId: number;
  semControles: boolean;
  justificativa: string | null;
  declaradoPor: string | null;
  declaradoEm: string | null;
  podeEditar: boolean;
  onAtualizado: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const botao: React.CSSProperties = { background: "none", border: 0, padding: 0, color: "var(--accent)", cursor: "pointer", font: "inherit" };

  async function enviar(metodo: "PUT" | "DELETE") {
    setEnviando(true);
    setErro(null);
    const r = await fetch(`/api/riscos/${riscoId}/sem-controles`, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: metodo === "PUT" ? JSON.stringify({ justificativa: texto }) : undefined,
    });
    const d = await r.json().catch(() => ({}));
    setEnviando(false);
    if (!r.ok) return setErro(d.error || "Não foi possível salvar.");
    setAberto(false);
    onAtualizado();
  }

  if (semControles) {
    return (
      <div style={{ borderLeft: "3px solid var(--border)", padding: "0.4rem 0.8rem", marginBottom: "1rem", fontSize: "0.85rem" }}>
        <strong>Declarado sem controles existentes.</strong> {justificativa}
        <div className="text-muted" style={{ fontSize: "0.75rem" }}>
          {declaradoPor}
          {declaradoEm ? ` · ${new Date(declaradoEm).toLocaleDateString("pt-BR")}` : ""}
          {podeEditar && (
            <>
              {" · "}
              <button type="button" style={botao} onClick={() => enviar("DELETE")} disabled={enviando}>
                desfazer
              </button>
            </>
          )}
        </div>
        {erro && <div style={{ color: "var(--danger)" }}>{erro}</div>}
      </div>
    );
  }

  return (
    <div style={{ borderLeft: "3px solid var(--danger)", padding: "0.4rem 0.8rem", marginBottom: "1rem", fontSize: "0.85rem" }}>
      <strong>Controles existentes não avaliados.</strong> Cadastre os controles que já existem (abaixo, em
      &quot;Novo fator de risco&quot;) para o nível atual refletir a redução, ou declare que não há controles.
      {podeEditar && !aberto && (
        <div>
          <button type="button" style={botao} onClick={() => setAberto(true)}>
            Declarar que não há controles
          </button>
        </div>
      )}
      {aberto && (
        <div style={{ marginTop: "0.5rem" }}>
          <textarea
            rows={2}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Por que não há controles para este risco?"
            style={{ width: "100%" }}
            aria-label="Justificativa"
          />
          {erro && <div style={{ color: "var(--danger)" }}>{erro}</div>}
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.4rem" }}>
            <button type="button" className="btn-primary" onClick={() => enviar("PUT")} disabled={enviando}>
              Registrar declaração
            </button>
            <button type="button" className="btn-secondary" onClick={() => setAberto(false)} disabled={enviando}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
