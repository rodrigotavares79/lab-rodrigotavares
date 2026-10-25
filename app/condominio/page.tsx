import Footer from "@/components/Footer";

export default function Condominio() {
  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Projeto</span>
          <h1>Gestão de Condomínio</h1>

          <div className="page-sidebar-layout">
            <nav className="page-submenu-vertical" aria-label="Navegação de Gestão de Condomínio">
              <a href="/condominio/novo-chamado">Abrir Chamado</a>
              <a href="/condominio/chamados">Chamados</a>
              <a href="/condominio/dashboard">Dashboard</a>
              <a href="/condominio/privacidade">Política de Privacidade</a>
              <div className="page-submenu-admin">
                <span className="page-submenu-admin-trigger">Administração</span>
                <div className="page-submenu-admin-items">
                  <a href="/condominio/fornecedores">Cadastrar Fornecedor</a>
                  <a href="/condominio/catalogo-de-servicos">Catálogo de Serviços</a>
                  <a href="/condominio/condominos">Manutenção de Condôminos</a>
                </div>
              </div>
            </nav>

            <div className="page-sidebar-content">
              <p className="lede">
                Sistema de gerenciamento de chamados para síndicos e
                condomínios — do registro de um problema até sua resolução.
              </p>

              <div className="body">
                <p>
                  Qualquer condômino pode abrir um chamado escolhendo um
                  serviço do catálogo; o síndico (ou conselheiro) acompanha,
                  atribui a um fornecedor quando necessário e registra a
                  resolução. Cada serviço já define a urgência e o prazo de
                  atendimento (SLA), calculado automaticamente a partir do
                  momento da abertura.
                </p>
                <p>Nesta página você encontra a estrutura completa do sistema:</p>
                <ul>
                  <li>
                    <strong>Abrir Chamado</strong> — formulário usado por
                    qualquer condômino para registrar um problema.
                  </li>
                  <li>
                    <strong>Chamados</strong> — lista de chamados (os seus,
                    se você é condômino; todos, se você é síndico ou
                    conselheiro), com acesso ao detalhe de cada um.
                  </li>
                  <li>
                    <strong>Dashboard</strong> — visão executiva do síndico:
                    chamados em aberto, prazos vencidos e distribuição por
                    status, urgência e tipo.
                  </li>
                  <li>
                    <strong>Administração</strong> — área restrita a síndico
                    e conselheiro:
                    <ul>
                      <li><strong>Cadastrar Fornecedor</strong> — empresas e contatos usados para atender os chamados.</li>
                      <li><strong>Catálogo de Serviços</strong> — serviços disponíveis para abertura de chamado, cada um com categoria, urgência, tipo (Problema ou Demanda) e prazo de atendimento (SLA) em horas.</li>
                      <li><strong>Manutenção de Condôminos</strong> — convite de novos moradores e definição do perfil (síndico, conselheiro ou condômino) e da unidade de cada um.</li>
                    </ul>
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
