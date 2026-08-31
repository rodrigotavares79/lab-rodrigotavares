import Footer from "@/components/Footer";

export default function LabHome() {
  return (
    <>
      <section className="hero">
        <div className="container">
          <span className="eyebrow">Lab</span>
          <h1 style={{ marginTop: "0.75rem" }}>
            Laboratório de idéias e projetos
          </h1>
          <p className="lede">
            Espaço privado de idéias, inovação e desenvovimento de aplicações.
          </p>
        </div>
      </section>

      <div className="section-grid">
        <a className="section-card" href="/condominio">
          <span className="eyebrow">Projeto</span>
          <h3>Gestão de Condomínio</h3>
          <p>Sistema de gerenciamento de chamados para síndicos e condomínios.</p>
        </a>

        <a className="section-card" href="/seguranca/gestao-de-riscos">
          <span className="eyebrow">Área</span>
          <h3>Segurança da Informação</h3>
          <p>Conteúdo e projetos em GRC, testes de segurança e conscientização.</p>
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

