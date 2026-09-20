import Footer from "@/components/Footer";

export default function GovernancaDeIA() {
  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Segurança da Informação</span>
          <h1>Governança de IA</h1>

          <div className="page-sidebar-layout">
            <nav className="page-submenu-vertical" aria-label="Navegação de Governança de IA">
              <a href="/seguranca/governanca-de-ia/politica">Política</a>
              <a href="/seguranca/governanca-de-ia/processo">Processo</a>
              <a href="/seguranca/governanca-de-ia/inventario">Inventário de Sistemas de IA</a>
              <a href="/seguranca/governanca-de-ia/dashboard">Dashboard</a>
            </nav>

            <div className="page-sidebar-content">
              <p className="lede">
                Governança de IA é o processo de controlar como sistemas de
                inteligência artificial são adotados, usados e monitorados
                dentro da organização, garantindo que o ganho de eficiência
                não venha às custas de riscos de segurança, privacidade,
                conformidade ou reputação.
              </p>

              <div className="body">
                <p>
                  Na prática, significa saber quais modelos e ferramentas de
                  IA estão em uso, por quem e para quê, avaliar os riscos
                  associados a cada uso antes (e depois) da adoção, e definir
                  regras claras sobre o que pode e o que não pode ser feito
                  com dados da organização em sistemas de IA — inclusive os
                  de terceiros.
                </p>
                <p>Nesta página você encontra a estrutura desse processo, organizada em quatro frentes:</p>
                <ul>
                  <li>
                    <strong>Política</strong> — as diretrizes que orientam o
                    uso responsável de IA, incluindo o que é permitido, o que
                    exige aprovação e o que é vedado.
                  </li>
                  <li>
                    <strong>Processo</strong> — o passo a passo utilizado
                    para avaliar, aprovar e monitorar a adoção de um sistema
                    de IA.
                  </li>
                  <li>
                    <strong>Inventário de Sistemas de IA</strong> — o
                    catálogo dos modelos e ferramentas de IA em uso, com sua
                    finalidade, dono e nível de risco.
                  </li>
                  <li>
                    <strong>Dashboard</strong> — a visão executiva com o
                    status consolidado da adoção de IA na organização.
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
