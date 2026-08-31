import Footer from "@/components/Footer";

export default function GestaoDeRiscos() {
  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Segurança da Informação</span>
          <h1>Gestão de Riscos</h1>

          <div className="page-sidebar-layout">
            <nav className="page-submenu-vertical" aria-label="Navegação de Gestão de Riscos">
              <a href="/seguranca/gestao-de-riscos/politica">Política</a>
              <a href="/seguranca/gestao-de-riscos/processo">Processo</a>
              <a href="/seguranca/gestao-de-riscos/cadastro-de-riscos">Cadastro de Riscos</a>
              <a href="/seguranca/gestao-de-riscos/dashboard">Dashboard</a>
            </nav>

            <div className="page-sidebar-content">
              <p className="lede">
                Gestão de Riscos de TI é o processo de identificar, analisar
                e tratar situações que podem comprometer a segurança, a
                disponibilidade ou a integridade dos ativos de tecnologia de
                uma organização.
              </p>

              <div className="body">
                <p>
                  Na prática, significa mapear o que pode dar errado — desde
                  uma falha técnica até uma brecha de segurança — avaliar o
                  quanto isso impactaria o negócio e definir ações para
                  reduzir essa exposição antes que o problema aconteça.
                </p>
                <p>Nesta página você encontra a estrutura completa desse processo, organizada em quatro frentes:</p>
                <ul>
                  <li>
                    <strong>Política</strong> — as diretrizes que orientam
                    como os riscos são tratados, incluindo papéis,
                    responsabilidades e periodicidade de revisão.
                  </li>
                  <li>
                    <strong>Processo</strong> — o passo a passo utilizado
                    para identificar, classificar, priorizar e tratar cada
                    risco.
                  </li>
                  <li>
                    <strong>Cadastro de Riscos</strong> — o formulário onde
                    os riscos são registrados individualmente, com sua
                    identificação e análise de impacto.
                  </li>
                  <li>
                    <strong>Dashboard</strong> — a visão executiva com
                    indicadores, gráficos e o status consolidado dos riscos e
                    planos de ação.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
