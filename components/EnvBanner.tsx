// Aviso visual de ambiente — evita confundir HMG/DEV com produção.
// Controlado por NEXT_PUBLIC_ENV_NAME (configurado por branch na
// Vercel); sem essa variável, não mostra nada (produção não precisa
// dela pra ficar "limpa" — falha em modo seguro).
const CONFIG: Record<string, { label: string; bg: string }> = {
  dev: { label: "AMBIENTE DE DESENVOLVIMENTO — dados de teste, pode quebrar", bg: "var(--text-muted)" },
  homolog: { label: "AMBIENTE DE HOMOLOGAÇÃO — dados de teste", bg: "var(--warning)" },
};

export default function EnvBanner() {
  const env = process.env.NEXT_PUBLIC_ENV_NAME;
  if (!env || !CONFIG[env]) return null;
  const { label, bg } = CONFIG[env];
  return (
    <div
      style={{
        background: bg,
        color: "#fff",
        textAlign: "center",
        fontSize: "0.75rem",
        fontWeight: 700,
        letterSpacing: "0.03em",
        padding: "0.35rem 0.75rem",
      }}
    >
      {label}
    </div>
  );
}
