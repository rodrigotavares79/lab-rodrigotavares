import Image from "next/image";
import Footer from "@/components/Footer";
import { getUsuarioCondominio, podeGerirChamados } from "@/lib/condominioAuth";

export default async function Condominio() {
  const usuario = await getUsuarioCondominio();
  const gerente = usuario ? podeGerirChamados(usuario.perfil) : false;

  return (
    <>
      <section className="content-block">
        <div className="container">
          <span className="eyebrow">Projeto</span>
          <h1 style={{ whiteSpace: "nowrap" }}>
            Gestão de Chamados do Condomínio <strong>Pontões de Santo Agostinho</strong>
          </h1>

          <div className="page-sidebar-layout">
            <div>
              <Image
                src="/condominio/logo.png"
                alt="Gestão de Condomínio"
                width={165}
                height={171}
                priority
                style={{ marginBottom: "1rem" }}
              />
              <nav className="page-submenu-vertical" aria-label="Navegação de Gestão de Condomínio">
                {gerente && (
                  <div className="page-submenu-admin">
                    <span className="page-submenu-admin-trigger">Administração</span>
                    <div className="page-submenu-admin-items">
                      <a href="/condominio/fornecedores">Cadastrar Fornecedor</a>
                      <a href="/condominio/catalogo-de-servicos">Catálogo de Serviços</a>
                      <a href="/condominio/condominos">Manutenção de Condôminos</a>
                    </div>
                  </div>
                )}
                <div className="page-submenu-admin">
                  <span className="page-submenu-admin-trigger">Chamados</span>
                  <div className="page-submenu-admin-items">
                    <a href="/condominio/novo-chamado">Abrir Chamado</a>
                    <a href="/condominio/chamados">Lista de Chamados</a>
                  </div>
                </div>
                <a href="/condominio/dashboard">Dashboard</a>
              </nav>
            </div>

            <div className="page-sidebar-content">
              <div className="dash-panel">
                <div className="dash-panel-body">
                  <p>
                    Olá! Bem vindo ao sistema de gestão de chamados do
                    condomínio <strong>PONTÕES DE SANTO AGOSTINHO</strong>.
                  </p>
                  <p>
                    Por aqui você conversa com o síndico através de chamados
                    para resolução de problemas ou atendimento de demandas e
                    pode acompanhar o passo-a-passo do atendimento.
                  </p>
                  <p style={{ marginBottom: 0 }}>
                    Em caso de dúvidas entre em contato com o síndico pelos
                    canais oficiais da gestão.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
