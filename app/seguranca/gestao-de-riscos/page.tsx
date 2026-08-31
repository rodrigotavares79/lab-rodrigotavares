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

          <nav className="page-submenu" aria-label="Navegação de Gestão de Riscos">
            <a href="/seguranca/gestao-de-riscos/politica">Política</a>
            <a href="/seguranca/gestao-de-riscos/processo">Processo</a>
            <a href="/seguranca/gestao-de-riscos/cadastro-de-riscos">Cadastro de Riscos</a>
            <a href="/seguranca/gestao-de-riscos/dashboard">Dashboard</a>
          </nav>

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
