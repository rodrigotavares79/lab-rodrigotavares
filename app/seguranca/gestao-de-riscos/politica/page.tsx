import Footer from "@/components/Footer";

export default function Politica() {
  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos</span>
          <h1>Política</h1>
          <p className="lede">
            [placeholder] Uma linha sobre a política de gestão de riscos de
            segurança da informação.
          </p>

          <div className="body">
            <p>
              [placeholder] Objetivo, escopo e diretrizes da política —
              papéis, responsabilidades e periodicidade de revisão.
            </p>
            <p className="text-muted">
              [placeholder] Referências normativas ou frameworks utilizados
              como base.
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
