import Footer from "@/components/Footer";

export default function Condominio() {
  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Projeto</span>
          <h1>Gestão de Condomínio</h1>
          <p className="lede">
            [placeholder] Uma linha resumindo o que é o sistema — pra quem é,
            que problema resolve.
          </p>

          <span className="status-tag">[placeholder] Em desenvolvimento</span>

          <div className="body">
            <p>
              [placeholder] Descrição do sistema de gerenciamento de
              chamados de condomínio: como funciona o fluxo de abertura,
              acompanhamento e resolução de chamados.
            </p>
            <p className="text-muted">
              [placeholder] Stack técnica usada, e o que já está pronto vs.
              o que ainda está em construção.
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
