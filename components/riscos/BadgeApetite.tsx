"use client";

import { ROTULO_SITUACAO_APETITE, type SituacaoApetite } from "@/lib/apetiteRisco";

// B18 · Selo da situação do risco frente ao apetite/tolerância da categoria.
// Cor + ícone + texto: a situação nunca depende só da cor.
const ESTILO: Record<SituacaoApetite, { fundo: string; cor: string; icone: string }> = {
  acima_tolerancia: { fundo: "var(--danger-tint)", cor: "var(--danger)", icone: "▲▲" },
  acima_apetite: { fundo: "var(--warning-tint)", cor: "var(--warning-text)", icone: "▲" },
  dentro: { fundo: "var(--success-tint)", cor: "var(--success)", icone: "✓" },
  sem_referencia: { fundo: "transparent", cor: "var(--text-muted)", icone: "—" },
};

export default function BadgeApetite({ situacao, detalhe }: { situacao: SituacaoApetite | null | undefined; detalhe?: string }) {
  if (!situacao) return <span className="text-muted">—</span>;
  const e = ESTILO[situacao];
  return (
    <span
      title={detalhe}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        padding: "0.15rem 0.55rem",
        borderRadius: "999px",
        fontSize: "0.78rem",
        fontWeight: 600,
        whiteSpace: "nowrap",
        background: e.fundo,
        color: e.cor,
        border: situacao === "sem_referencia" ? "1px dashed var(--border)" : "none",
      }}
    >
      <span aria-hidden="true" style={{ fontSize: "0.65rem" }}>{e.icone}</span>
      {ROTULO_SITUACAO_APETITE[situacao]}
    </span>
  );
}
