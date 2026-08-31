import Footer from "@/components/Footer";

export default function LabHome() {
  return (
    <>
      <section className="hero">
        <div className="container">
          <span className="eyebrow">Lab</span>
          <h1 style={{ marginTop: "0.75rem" }}>
            [placeholder] Uma linha curta sobre o que esse espaço reúne
          </h1>
          <p className="lede">
            [placeholder] Duas frases sobre o propósito do lab — projetos e
            conteúdo técnico nas áreas de gestão de condomínio e segurança da
            informação.
          </p>
        </div>
      </section>

      <div className="section-grid">
        <a className="section-card" href="/condominio">
          <span className="eyebrow">Projeto</span>
          <h3>Gestão de Condomínio</h3>
          <p>[placeholder] Uma linha resumindo o sistema de chamados em desenvolvimento.</p>
        </a>

        <a className="section-card" href="/seguranca/gestao-de-riscos">
          <span className="eyebrow">Área</span>
          <h3>Segurança da Informação</h3>
          <p>[placeholder] Conteúdo e projetos em GRC, testes de segurança e conscientização.</p>
          <div className="sublist">
            <span>→ Gestão de Riscos</span>
            <span>→ Penteste</span>
            <span>→ Programa de Conscientização</span>
          </div>
        </a>
      </div>

      <Footer />
    </>
  );
}
