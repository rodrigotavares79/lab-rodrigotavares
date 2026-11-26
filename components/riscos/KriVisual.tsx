"use client";

import { ROTULO_FAIXA, type FaixaKri } from "@/lib/kriRisco";

// B21 · Selo da faixa do KRI (cor + ícone + texto) e minigráfico das últimas
// medições. A faixa nunca depende só da cor.

const ESTILO: Record<FaixaKri, { fundo: string; cor: string; icone: string }> = {
  vermelho: { fundo: "var(--danger-tint)", cor: "var(--danger)", icone: "▲▲" },
  amarelo: { fundo: "var(--warning-tint)", cor: "var(--warning-text)", icone: "▲" },
  verde: { fundo: "var(--success-tint)", cor: "var(--success)", icone: "✓" },
};

export const COR_FAIXA: Record<FaixaKri, string> = {
  vermelho: "var(--danger)",
  amarelo: "var(--warning)",
  verde: "var(--success)",
};

export function SeloFaixa({ faixa }: { faixa: FaixaKri | null | undefined }) {
  if (!faixa) {
    return (
      <span className="text-muted" style={{ fontSize: "0.78rem", border: "1px dashed var(--border)", borderRadius: 999, padding: "0.1rem 0.5rem" }}>
        sem medição
      </span>
    );
  }
  const e = ESTILO[faixa];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        padding: "0.15rem 0.55rem",
        borderRadius: 999,
        fontSize: "0.78rem",
        fontWeight: 600,
        whiteSpace: "nowrap",
        background: e.fundo,
        color: e.cor,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: "0.65rem" }}>{e.icone}</span>
      {ROTULO_FAIXA[faixa]}
    </span>
  );
}

export function MiniGrafico({ pontos, largura = 110, altura = 28 }: { pontos: { valor: number; faixa: FaixaKri; referencia: string }[]; largura?: number; altura?: number }) {
  if (pontos.length < 2) return <span className="text-muted" style={{ fontSize: "0.75rem" }}>—</span>;
  const vs = pontos.map((p) => Number(p.valor));
  const min = Math.min(...vs);
  const max = Math.max(...vs);
  const faixaY = max - min || 1;
  const x = (i: number) => 4 + (i * (largura - 8)) / (pontos.length - 1);
  const y = (v: number) => altura - 4 - ((v - min) / faixaY) * (altura - 8);
  const resumo = pontos.map((p) => `${p.referencia.slice(5, 7)}/${p.referencia.slice(2, 4)}: ${p.valor}`).join(", ");
  return (
    <svg width={largura} height={altura} role="img" aria-label={`Últimas medições: ${resumo}`}>
      <title>{resumo}</title>
      <polyline
        points={pontos.map((p, i) => `${x(i)},${y(Number(p.valor))}`).join(" ")}
        fill="none"
        stroke="var(--text-muted)"
        strokeWidth={1.5}
      />
      {pontos.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(Number(p.valor))} r={i === pontos.length - 1 ? 3.5 : 2} fill={COR_FAIXA[p.faixa]} stroke="var(--surface)" strokeWidth={1} />
      ))}
    </svg>
  );
}
