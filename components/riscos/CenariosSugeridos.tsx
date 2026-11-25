"use client";

import { useEffect, useState } from "react";

// B27 · No cadastro, sugere cenários do catálogo parecidos com o que está
// sendo digitado. "Usar este cenário" liga o risco ao cenário e preenche
// causa, evento e consequência com o texto padrão (editável).

export type CenarioCatalogo = {
  id: number;
  codigo: string;
  nome: string;
  evento: string;
  causa: string;
  consequencia: string;
  nota?: number;
};

export default function CenariosSugeridos({
  evento,
  causa,
  consequencia,
  escolhido,
  onUsar,
  onDesligar,
}: {
  evento: string;
  causa: string;
  consequencia: string;
  escolhido: CenarioCatalogo | null;
  onUsar: (c: CenarioCatalogo) => void;
  onDesligar: () => void;
}) {
  const [sugestoes, setSugestoes] = useState<CenarioCatalogo[]>([]);

  useEffect(() => {
    if (escolhido || (evento.trim().length < 5 && causa.trim().length < 5)) {
      setSugestoes([]);
      return;
    }
    const t = setTimeout(() => {
      fetch("/api/cenarios/sugerir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evento, causa, consequencia }),
      })
        .then((r) => r.json())
        .then((d) => setSugestoes(d.sugestoes || []))
        .catch(() => setSugestoes([]));
    }, 600);
    return () => clearTimeout(t);
  }, [evento, causa, consequencia, escolhido]);

  const botao: React.CSSProperties = {
    background: "none",
    border: 0,
    padding: 0,
    color: "var(--accent)",
    cursor: "pointer",
    font: "inherit",
  };

  if (escolhido) {
    return (
      <div className="form-field form-field-wide">
        <p className="field-helper" style={{ margin: 0 }}>
          <strong>Cenário do catálogo:</strong> {escolhido.codigo} · {escolhido.nome}.{" "}
          <button type="button" style={botao} onClick={onDesligar}>
            Desligar
          </button>
        </p>
      </div>
    );
  }
  if (sugestoes.length === 0) return null;
  return (
    <div className="form-field form-field-wide">
      <div className="dash-panel" style={{ margin: 0 }}>
        <div className="dash-panel-header">Cenários do catálogo parecidos</div>
        <div className="dash-panel-body">
          <p className="field-helper" style={{ marginTop: 0 }}>
            Ligar o risco a um cenário do catálogo permite ver o mesmo cenário em todos os projetos. O risco continua com
            avaliação, dono e tratamento próprios.
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.6rem" }}>
            {sugestoes.map((c) => (
              <li key={c.id} style={{ borderTop: "1px solid var(--border)", paddingTop: "0.5rem" }}>
                <strong>{c.codigo}</strong> · {c.nome}
                {typeof c.nota === "number" && (
                  <span className="text-muted" style={{ fontSize: "0.78rem" }}> · {Math.round(c.nota * 100)}% parecido</span>
                )}
                <div>
                  <button type="button" style={botao} onClick={() => onUsar(c)}>
                    Usar este cenário
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
