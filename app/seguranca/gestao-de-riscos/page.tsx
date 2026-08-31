import Footer from "@/components/Footer";

export default function GestaoDeRiscos() {
  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Segurança da Informação</span>
          <h1>Gestão de Riscos</h1>
          <p className="lede">
            [placeholder] Uma linha sobre a abordagem de análise e gestão de
            riscos de segurança da informação.
          </p>

          <div className="body">
            <p>
              [placeholder] Metodologia usada para identificação,
              classificação e priorização de riscos — e como isso se traduz
              em planos de ação e relatórios executivos.
            </p>
            <p className="text-muted">
              [placeholder] Exemplos, templates ou aprendizados que você
              queira compartilhar publicamente.
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
