import Footer from "@/components/Footer";

export default function Dashboard() {
  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos</span>
          <h1>Dashboard</h1>
          <p className="lede">
            [placeholder] Uma linha sobre o painel de indicadores de riscos.
          </p>

          <div className="body">
            <p>
              [placeholder] Visão executiva com indicadores, gráficos e
              status dos riscos e planos de ação.
            </p>
            <p className="text-muted">
              [placeholder] Em desenvolvimento.
            </p>
          </div>

          <a href="/seguranca/gestao-de-riscos" className="status-tag">
            ← Voltar para Gestão de Riscos
          </a>
        </div>
      </section>
      <Footer />
    </>
  );
}
