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
              <a href="/condominio/fornecedores">Fornecedores</a>
              <a href="/condominio/tipos-chamado">Tipos de Chamado</a>
              <a href="/condominio/dashboard">Dashboard</a>
            </nav>

            <div className="page-sidebar-content">
              <p className="lede">
                Sistema de gerenciamento de chamados para síndicos e
                condomínios — do registro de um problema até sua resolução.
              </p>

              <div className="body">
                <p>
                  Qualquer condômino pode abrir um chamado descrevendo um
                  problema; o síndico (ou conselheiro) acompanha, atribui a
                  um fornecedor quando necessário e registra a resolução.
                  Cada tipo de chamado tem um prazo de atendimento (SLA)
                  configurável, calculado automaticamente a partir do
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
                    <strong>Fornecedores</strong> — cadastro das empresas e
                    contatos usados para atender os chamados.
                  </li>
                  <li>
                    <strong>Tipos de Chamado</strong> — categorias
                    configuráveis pelo síndico, cada uma com seu prazo de
                    atendimento (SLA) em horas.
                  </li>
                  <li>
                    <strong>Dashboard</strong> — visão executiva do síndico:
                    chamados em aberto, prazos vencidos e distribuição por
                    status, urgência e tipo.
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
