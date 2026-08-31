import Footer from "@/components/Footer";

export default function CadastroDeRiscos() {
  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Gestão de Riscos</span>
          <h1>Cadastro de Riscos</h1>
          <p className="lede">
            [placeholder] Uma linha sobre o cadastro de riscos e planos de
            ação.
          </p>

          <div className="body">
            <p>
              [placeholder] Aqui entrará o sistema de cadastro de riscos de
              TI, com registro de riscos, planos de ação e relatórios
              executivos.
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
