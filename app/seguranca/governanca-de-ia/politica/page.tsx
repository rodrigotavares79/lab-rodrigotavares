import Footer from "@/components/Footer";

export default function GovernancaDeIAPolitica() {
  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Governança de IA</span>
          <h1>Política</h1>
          <p className="lede">
            [placeholder] Diretrizes de uso responsável de IA — o que é
            permitido, o que exige aprovação e o que é vedado.
          </p>

          <div className="body">
            <p>
              [placeholder] Objetivo, escopo e definições da política de
              governança de IA.
            </p>
            <p className="text-muted">
              [placeholder] Papéis, responsabilidades e processo de revisão.
            </p>
          </div>

          <a href="/seguranca/governanca-de-ia" className="status-tag">
            ← Voltar para Governança de IA
          </a>
        </div>
      </section>
      <Footer />
    </>
  );
}
